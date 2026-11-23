-- CreateTable
CREATE TABLE "PermisoUsuario" (
    "usuarioId" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "permitido" BOOLEAN NOT NULL,

    CONSTRAINT "PermisoUsuario_pkey" PRIMARY KEY ("usuarioId","clave")
);

-- AddForeignKey
ALTER TABLE "PermisoUsuario" ADD CONSTRAINT "PermisoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
