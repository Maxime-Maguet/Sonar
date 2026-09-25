import { ArgumentsHost, Catch, HttpStatus, Logger } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../../generated/prisma/client.js';
import { Response } from 'express';

// Traduit une erreur Prisma « connue » (code Pxxxx) en réponse HTTP JSON.
// Sans ce filtre, Nest répond 500 « Internal server error » : le client
// ne distingue pas un doublon, un id introuvable, ou une clé étrangère cassée.
//
// @Catch limite cette classe à PrismaClientKnownRequestError.
// Connexion Postgres down, requête mal formée, panic du moteur : autres classes,
// elles ne passent pas ici.
//
// Branché dans main.ts :
//   const { httpAdapter } = app.get(HttpAdapterHost);
//   app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
// L'adapter sert à BaseExceptionFilter. Cette classe écrit elle-même chaque JSON,
// y compris le default, pour garder les clés statusCode, code et message.
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    // Trace serveur seulement. On ne renvoie jamais exception.message au client :
    // Prisma y cite des tables et des champs, pas les valeurs.
    this.logger.error(`${exception.code} ${exception.message}`);

    // host = contexte Nest de la requête (HTTP, et éventuellement autre transport).
    // switchToHttp() expose la réponse Express sur laquelle on écrit le JSON.
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // exception.code est le code Prisma (P2002…), pas le statut HTTP.
    switch (exception.code) {
      case 'P2002': {
        // Contrainte unique violée.
        // Dans Sonar : User.email, Company.siren / siretHeadquarter / slug,
        // Technology.name / slug, et (source, externalId) des signaux, events, offres.
        // L'upsert SIRENE cherche par siren : un slug ou un siret déjà pris
        // par une autre entreprise tombe quand même dans ce cas.
        this.reply(
          response,
          HttpStatus.CONFLICT,
          exception.code,
          'Une ressource avec ces informations existe déjà',
        );
        break;
      }
      case 'P2025': {
        // L'enregistrement visé par update, delete ou findUniqueOrThrow n'existe pas.
        // findUnique (sans OrThrow) renvoie null : il ne lève pas P2025.
        this.reply(
          response,
          HttpStatus.NOT_FOUND,
          exception.code,
          "La ressource demandée n'existe pas",
        );
        break;
      }
      case 'P2003': {
        // Contrainte de clé étrangère, pas un doublon. Deux situations dans le schéma :
        // - créer une ligne dont le parent n'existe pas (companyId, userId, …) ;
        // - supprimer un parent encore référencé. Application.company, Event.community
        //   et Application.jobOpportunity n'ont pas onDelete: Cascade.
        this.reply(
          response,
          HttpStatus.CONFLICT,
          exception.code,
          'La ressource liée est introuvable ou encore référencée',
        );
        break;
      }
      default:
        // Autre code Pxxxx (valeur trop longue, null interdit, table absente).
        // 500 au message générique : le code Prisma reste dans le JSON, pas le détail SQL.
        this.reply(
          response,
          HttpStatus.INTERNAL_SERVER_ERROR,
          exception.code,
          'Une erreur interne est survenue',
        );
        break;
    }
  }

  // Un seul endroit pour la forme promise au front : statusCode, code, message.
  private reply(
    response: Response,
    status: HttpStatus,
    code: string,
    message: string,
  ) {
    response.status(status).json({
      statusCode: status,
      code,
      message,
    });
  }
}
