import { z } from 'zod';
export const RoleSchema = z.enum(['SELLER', 'SUPERVISOR', 'OWNER', 'ADMIN']);
export type Role = z.infer<typeof RoleSchema>;
const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9._-]+$/, 'Usá letras, números, punto o guion para el usuario.');
export const PasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(128)
  .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula.')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un carácter especial.')
  .refine((value) => !/(.)\1{7,}/.test(value), {
    message: 'Elegí una contraseña que no repita el mismo carácter muchas veces.',
  });
export const AdminPasswordSchema = z
  .string()
  .min(16, 'La contraseña del administrador debe tener al menos 16 caracteres.')
  .max(128)
  .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula.')
  .regex(/[a-z]/, 'La contraseña debe incluir una minúscula.')
  .regex(/[0-9]/, 'La contraseña debe incluir un número.')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un carácter especial.')
  .refine((value) => !/(.)\1{7,}/.test(value), {
    message: 'Elegí una contraseña que no repita el mismo carácter muchas veces.',
  });
export const BootstrapSchema = z.strictObject({
  username,
  name: z.string().trim().min(2).max(100),
  password: PasswordSchema,
});
export const LoginSchema = z.strictObject({ username, password: z.string().min(1).max(128) });
export const UserSaveSchema = z
  .strictObject({
    id: z.uuid().optional(),
    expectedRevision: z.number().int().positive().optional(),
    username,
    name: z.string().trim().min(2).max(100),
    role: RoleSchema,
    active: z.boolean(),
    password: PasswordSchema.optional(),
  })
  .refine(
    (v) => Boolean(v.id) === Boolean(v.expectedRevision) && (Boolean(v.id) || Boolean(v.password)),
    { message: 'Una cuenta nueva requiere contraseña; una edición requiere revisión.' },
  );
export const ChangePasswordSchema = z.strictObject({
  currentPassword: z.string().min(1).max(128),
  newPassword: PasswordSchema,
});
export const UnlockUserSchema = z.strictObject({ username });
export type BootstrapInput = z.infer<typeof BootstrapSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UserSaveInput = z.infer<typeof UserSaveSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type UnlockUserInput = z.infer<typeof UnlockUserSchema>;
export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  active: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface AuthStatus {
  initialized: boolean;
  user: User | null;
}
export const UserSchema = z.strictObject({
  id: z.uuid(),
  username: z.string(),
  name: z.string(),
  role: RoleSchema,
  active: z.boolean(),
  revision: z.number().int().positive(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
