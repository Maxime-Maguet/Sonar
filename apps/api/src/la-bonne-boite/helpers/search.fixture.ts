/**
 * Contrat OpenAPI LBB v2.27.3 (schema SearchResponse / SearchResponseItem).
 * Exemple officiel Stoplight — pas un dump Postman Toulouse.
 * Les tests mockent fetch avec cet objet ; aucun appel France Travail.
 */
export const LBB_SEARCH_ITEM_EXAMPLE = {
  city: 'Metz',
  citycode: '57463',
  company_name: 'MAISON NICOLAS',
  department: 'Moselle',
  department_number: 57,
  headcount_max: '5',
  headcount_min: '3',
  hiring_potential: 2.4201609999999993,
  id: 4636621,
  is_high_potential: false,
  location: {
    lat: 49.1196,
    lon: 6.17373,
  },
  naf: '4781Z',
  naf_label: 'Commerce de détail alimentaire sur éventaires et marchés',
  office_name: '',
  postcode: '57000',
  region: 'Grand Est',
  rome: 'D1102',
  siret: '30509416100034',
} as const;

export const LBB_SEARCH_RESPONSE_EXAMPLE = {
  hits: 1,
  items: [LBB_SEARCH_ITEM_EXAMPLE],
  params: {
    rome: ['D1102'],
    citycode: ['57463'],
  },
  resolved_params: null,
} as const;
