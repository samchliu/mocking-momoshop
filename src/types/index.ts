/**
 * Shared domain types (the contract between sections).
 * Owned by the integrator — sections import from here, they do not edit it.
 */
export interface ImageAsset {
  src: string
  alt: string
  width: number
  height: number
}

export interface Product {
  id: string
  name: string
  image: ImageAsset
  price: number
  originalPrice?: number
  href: string
  tags?: string[]
}

export interface NavLink {
  id: string
  label: string
  href: string
}
