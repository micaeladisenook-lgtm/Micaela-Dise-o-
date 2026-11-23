-- Fotos de muestra de los colores de tela (satén / plush)
CREATE TABLE "FotoColor" (
    "color" TEXT NOT NULL,
    "tela" TEXT NOT NULL,
    "imagen" TEXT NOT NULL,

    CONSTRAINT "FotoColor_pkey" PRIMARY KEY ("color","tela")
);
