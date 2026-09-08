# Migración a Firebase Authentication

## 1. Crear el usuario
En Firebase Console:
Authentication > Sign-in method > Email/Password: habilitarlo.

Luego:
Authentication > Users > Add user

Crea la cuenta que utilizarás para Aquarium Fish.

## 2. Primera entrada con las reglas antiguas
Si ya existe información en `appData/aquariumFish`, NO publiques todavía las reglas de `firestore.rules`.

Publica primero la aplicación modificada manteniendo temporalmente las reglas antiguas. Inicia sesión una vez. La aplicación añadirá `ownerUid` al documento existente.

## 3. Publicar las reglas nuevas
Después de comprobar que el documento `appData/aquariumFish` tiene un campo `ownerUid` con el UID de tu usuario, reemplaza las reglas de Firestore por el contenido de `firestore.rules`.

A partir de ese momento:
- usuarios no autenticados: sin acceso;
- otro usuario autenticado: sin acceso;
- propietario del documento: acceso de lectura/escritura.

## 4. Datos locales
La aplicación nueva separa el almacenamiento local por UID:
`aquarium_fish_data_v5_<UID>`.

Esto evita que una segunda cuenta del mismo navegador herede automáticamente los datos locales de la primera.
