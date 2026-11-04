export type PublicDealerBrand = {
  slug: string
  companyName: string
  logoUrl: string | null
  logoLightUrl: string | null
  logoPlacement: 'header' | 'hero'
  primaryColor: string | null
  secondaryColor: string | null
  websiteUrl: string | null
  headingFontFamily: string | null
  headingFontWeight: number | null
  headingFontSize: number | null
  bodyFontFamily: string | null
  bodyFontWeight: number | null
  bodyFontSize: number | null
  customHeadingFontUrl: string | null
  customHeadingFontName: string | null
  customHeadingFontWeight: number | null
  customBodyFontUrl: string | null
  customBodyFontName: string | null
  customBodyFontWeight: number | null
}
