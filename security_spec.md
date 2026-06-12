# Security Specification - SpaceOne Conciergerie

## 1. Data Invariants
- An Apartment must be linked to a valid `ownerId` representing the workspace host.
- A Booking must belong to an `apartmentId` and an `ownerId`.
- Unauthenticated clients (guests) can read/get a host's profile and apartments list to select and book they like.
- Unauthenticated clients can create bookings linked to a specific `ownerId`.
- HomeOwners can only modify/delete their owned resources (apartments, bookings, cleaning tasks, communication threads) unless they are an `admin`.
- Authentication roles (`role`) and suspension states (`suspended`) can only be modified by the System Admin (`admin@spaceone.com` or `jeremytopaka@gmail.com`).

## 2. Validation Payloads & Permissions
We allow:
- `get` on `/users/{userId}` for public banner branding.
- `list` / `get` on `/apartments` to let unauthenticated and authenticated clients pick the best accommodation.
- `create` on `/bookings` by guest clients with custom validations.
- `create` on `/threads` by guest clients to start messaging with their host.
