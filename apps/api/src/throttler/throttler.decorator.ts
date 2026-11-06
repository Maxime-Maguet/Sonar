import {
  THROTTLER_LIMIT,
  THROTTLER_SKIP,
  THROTTLER_TTL,
} from './throttler.constants.js';
import type { ThrottleOverrides } from './throttler.interfaces.js';

type ClassOrMethodDecorator = ClassDecorator & MethodDecorator;

function targetOf(
  target: object,
  descriptor: PropertyDescriptor | undefined,
): object {
  return (descriptor?.value as object | undefined) ?? target;
}

/** Surcharge `limit` / `ttl` (ms) d'un limiteur nommé, sur une classe ou une route. */
export const Throttle = (options: ThrottleOverrides): ClassOrMethodDecorator =>
  ((
    target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    const reflectionTarget = targetOf(target, descriptor);
    for (const name of Object.keys(options)) {
      Reflect.defineMetadata(
        THROTTLER_TTL + name,
        options[name].ttl,
        reflectionTarget,
      );
      Reflect.defineMetadata(
        THROTTLER_LIMIT + name,
        options[name].limit,
        reflectionTarget,
      );
    }
    return descriptor ?? target;
  }) as ClassOrMethodDecorator;

/**
 * Ignore les limiteurs nommés indiqués (`{ nom: true }`), sur une classe ou
 * une route. Une valeur `false` sur la route réactive un limiteur ignoré par
 * la classe.
 */
export const SkipThrottle = (
  skip: Record<string, boolean> = { default: true },
): ClassOrMethodDecorator =>
  ((
    target: object,
    _propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    const reflectionTarget = targetOf(target, descriptor);
    for (const name of Object.keys(skip)) {
      Reflect.defineMetadata(
        THROTTLER_SKIP + name,
        skip[name],
        reflectionTarget,
      );
    }
    return descriptor ?? target;
  }) as ClassOrMethodDecorator;
