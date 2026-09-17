# Contracts: Usuarios y permisos

auth.status -> initialized/user|null; auth.bootstrap(name,username,password) -> User;
auth.login(username,password) -> User; auth.logout -> null;
auth.changePassword(currentPassword,newPassword) -> null (revoca sesiones).

users.list -> User[]; users.save(create/update con expectedRevision) -> User.
Sólo OWNER. User nunca incluye password_hash ni sesión.

checkout.cancelDraft(expectedRevision) -> null; revisión requerida y usuario de sesión.

UNAUTHENTICATED, FORBIDDEN y AUTH_THROTTLED son errores públicos diferenciados.
Token interno en envelope worker; no forma parte de RequestSchemas/BochaApi públicas.
Matriz central en domain/permissions.ts; operaciones nuevas se deniegan por defecto.
