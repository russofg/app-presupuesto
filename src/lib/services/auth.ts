import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { deleteAllUserData } from "@/lib/services/firestore";

const googleProvider = new GoogleAuthProvider();

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signInWithGoogle(): Promise<User> {
  const { user } = await signInWithPopup(auth, googleProvider);
  return user;
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No hay usuario autenticado");

  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function deleteAccount(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado");
  // Borrar los datos de Firestore ANTES de eliminar el usuario de Auth: una vez
  // borrado el usuario, las reglas ya no permiten acceder a esos documentos.
  await deleteAllUserData(user.uid);
  await deleteUser(user);
}
