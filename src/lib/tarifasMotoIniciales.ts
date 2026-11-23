// Lista de precios de motomensajería (carga inicial; después se edita desde Envíos)
const z = (zona: string, texto: string) =>
  texto.trim().split("\n").map((l) => {
    const [localidad, precio] = l.split("|");
    return { zona, localidad: localidad.trim(), precio: Number(precio) };
  });

export const TARIFAS_MOTO_INICIALES = [
  ...z("Zona Oeste", `
Aldo Bonzi|7500
Castelar|7500
Caseros|8000
Cañuelas|16000
Ciudad Evita|7500
Ciudadela|7500
El Palomar|7500
Francisco Álvarez|9000
Gral. Rodríguez|11000
González Catán|8000
Gregorio de Laferrere|7500
Haedo|7500
Hurlingham|8000
Isidro Casanova|7500
Ituzaingó|8000
Ituzaingó Udaondo|8000
José Ingenieros|7500
Libertad|7500
La Tablada|7500
La Reja|8500
Lomas del Mirador|7500
Morón|7500
Martín Coronado|7500
Mariano Acosta|8000
Merlo|8000
Merlo Gómez|7500
Merlo p. San Martín|8000
Merlo Ferrari|8000
Moreno|9000
Cuartel V|9000
Pontevedra|8000
Pablo Podestá|9000
Paso del Rey|9000
Rafael Castillo|7500
Ramos Mejía|7500
Sáenz Peña|8000
San Antonio de Padua|8000
Santos Lugares|8000
San Justo|7500
Tapiales|7500
Villa Bosch|8000
Villa Celina|7500
Villa Luzuriaga|7500
Villa Sarmiento|7500
Villa Madero|7500
Villa Tesei|7500
Virrey del Pino (hasta km 38)|9000
Virrey del Pino (desde km 38)|10000
William C. Morris|8000`),
  ...z("Zona Sur", `
9 de Abril|9000
Adrogué|9000
Alejandro Korn|11000
Avellaneda|9000
Banfield|9000
Berazategui|9500
Bernal|9000
Burzaco|9000
Canning|9000
Carlos Spegazzini|9000
Claypole|9000
Don Orione|9000
Ezeiza|9000
Ezeiza La Unión|9000
El Jagüel|9000
El Pato|11000
Ezpeleta|9000
Florencio Varela|10000
Gerli|9000
Guernica|9500
Glew|9500
Hudson|10000
Ingeniero Budge|9000
José Mármol|9000
Lanús|9000
Llavallol|9000
Lomas de Zamora|9000
Longchamps|9000
Luis Guillón|9000
Malvinas Argentinas (Sur)|9000
Monte Chingolo|9000
Monte Grande|9000
Quilmes|9500
Rafael Calzada|9000
Remedios de Escalada|9000
San Francisco Solano|9000
San Vicente|15000
Sarandí|9000
Temperley|9000
Tristán Suárez|9000
Valentín Alsina|9000
Villa Albertina|9000
Villa Domínico|9000
Villa España|9000
Wilde|9000
Bosques|10000
Ing. Juan Allan|10000
La Plata|30000`),
  ...z("Zona Norte", `
Acassuso|9000
Adolfo Sourdeaux|9000
Beccar|9000
Bella Vista|9000
Belén de Escobar|17000
Benavídez|10000
Boulogne|9000
Del Viso|10000
Don Torcuato|9000
El Talar|9000
Florida|9000
Garín|10000
Grand Bourg|9000
Gral. Pacheco|9000
Ing. Maschwitz|11000
José C. Paz|9000
Los Polvorines|9000
Manuel Alberti|10000
Malvinas Argentinas|9000
Martínez|9000
Maquinista Savio|11000
Munro|9000
Nordelta|9000
Olivos|9000
Rincón de Milberg|9000
San Fernando|9000
San Isidro|9000
San Miguel|9000
San Martín|9000
San Andrés|9000
Pres. Derqui|10000
Pilar|10000
Pablo Nogués|9000
Tortuguitas|9000
Tigre|9000
Vicente López|9000
Villa Adelina|9000
Villa Ballester|9000
Villa Lynch|9000
Villa Maipú|9000
Villa Martelli|9000
Villa de Mayo|9000
Victoria|9000
Virreyes|9000
José León Suárez|9000
Loma Hermosa|9000`),
  ...z("CABA", `
Agronomía|8500
Almagro|8500
Balvanera|8500
Barracas|8500
Belgrano|8500
La Boca|8500
Boedo|8500
Caballito|8500
Coghlan|8500
Colegiales|8500
Congreso|8500
Constitución|8500
Chacarita|8500
Flores|8500
Floresta|8500
Liniers|8500
Mataderos|8500
Microcentro|8500
Monserrat|8500
Monte Castro|8500
Nueva Pompeya|8500
Núñez|8500
Once|8500
Palermo|8500
Parque Avellaneda|8500
Paternal|8500
Puerto Madero|8500
Parque Chacabuco|8500
Parque Chas|8500
Parque Patricios|8500
Recoleta|8500
Retiro|8500
San Telmo|8500
San Nicolás|8500
Saavedra|8500
San Cristóbal|8500
Versalles|8500
Vélez Sarsfield|8500
Villa Urquiza|8500
Villa Soldati|8500
Villa Crespo|8500
Villa Gral. Mitre|8500
Villa Devoto|8500
Villa del Parque|8500
Villa Lugano|8500
Villa Luro|8500
Villa Ortúzar|8500
Villa Pueyrredón|8500
Villa Santa Rita|8500
Villa Riachuelo|8500`),
];
