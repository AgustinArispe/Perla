import { z } from 'zod';
export const RoleSchema = z.enum(['SELLER', 'SUPERVISOR', 'OWNER']);
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
  .min(15, 'La contraseña debe tener al menos 15 caracteres.')
  .max(128);
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
export type BootstrapInput = z.infer<typeof BootstrapSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UserSaveInput = z.infer<typeof UserSaveSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
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
