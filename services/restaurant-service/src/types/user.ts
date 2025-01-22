

export interface User {
    _id: string
    name: string
    email: string
    mobileNumber: string[]
    displayImage: String
    address: Address
    category: string
    rating: number
    openingHours: number
    deliveryRange: number
    createdAt: Date

}

interface Address {
    houseNo: string
    streetNo: string
    district: string
    city: string
    state: string
    postalCode: number
  }