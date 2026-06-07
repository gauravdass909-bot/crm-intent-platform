// export {} makes this a module so the declare module below is an augmentation,
// not an ambient replacement of the entire next-auth package.
export {}

declare module "next-auth" {
  interface User {
    role?: string
  }
  interface Session {
    user: {
      id: string
      role: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    sub: string
  }
}
