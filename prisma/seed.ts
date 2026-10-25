import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, QuoteStatus, ChequeType, ChequeStatus, PaymentMethod, StockStatus, UserRole, AchatStatus, AchatType, MouvementType, ReferenceType } from "@/prisma/generated/prisma/client";



async function main() {
    console.log("🌱 Seeding database...");

    // Clean up
    await prisma.payment.deleteMany();
    await prisma.cheque.deleteMany();
    await prisma.invoiceLine.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.quoteLine.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.bonLivraisonLine.deleteMany();
    await prisma.bonLivraison.deleteMany();
    await prisma.bonCommandeLine.deleteMany();
    await prisma.bonCommande.deleteMany();
    await prisma.exportLine.deleteMany();
    await prisma.export.deleteMany();
    await prisma.avoirLine.deleteMany();
    await prisma.avoir.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.achatLine.deleteMany();
    await prisma.achat.deleteMany();
    await prisma.marque.deleteMany();
    await prisma.product.deleteMany();
    await prisma.tiers.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
    await prisma.appSettings.deleteMany();

    // Default company
    const company = await prisma.company.create({
        data: {
            name: "Factory Trade",
            matriculeFiscal: "1756917/L/A/M/000",
            adresse: "Avenie de l'environement",
            ville: "Grombalia",
            codePostal: "8030",
            telephone: "+216 72 256 709",
            email: "contact@factory-trade.com",
            siteWeb: "www.factory-trade.com",
            ribBancaire: "07 123 0012345678901 23",
            banque: "ATTIJARI BANK",
            tauxTVADefaut: 19,
            tauxFodecDefaut: 1,
        },
    });

    // Default admin user (password: admin123 — hashed with bcryptjs)
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await prisma.user.create({
        data: {
            name: "Admin",
            email: "admin@factory-trade.com",
                passwordHash: hashedPassword,
            role: UserRole.ADMIN,
            companyId: company.id,
        },
    });

    // App settings
    await prisma.appSettings.create({
        data: {},
    });

    // Tiers (clients)
    const clients = await Promise.all([
        prisma.tiers.create({
            data: {
                code: "SO",
                raisonSociale: "Société Tunisienne Import",
                matriculeFiscal: "1234567/A/M/000",
                adresse: "45 Avenue Habib Bourguiba",
                ville: "Tunis",
                codePostal: "1001",
                telephone: "+216 71 234 567",
                email: "contact@sti.tn",
                assujettTVA: true,
                tauxRetenue: 1.5,
                isClient: true,
                isFournisseur: false,
            },
        }),
        prisma.tiers.create({
            data: {
                code: "DI",
                raisonSociale: "Distributions Sfax SARL",
                matriculeFiscal: "7654321/B/P/001",
                adresse: "23 Rue du Commerce",
                ville: "Sfax",
                codePostal: "3000",
                telephone: "+216 74 567 890",
                email: "info@dssfax.tn",
                assujettTVA: true,
                tauxRetenue: 0,
                isClient: true,
                isFournisseur: false,
            },
        }),
        prisma.tiers.create({
            data: {
                code: "EL",
                raisonSociale: "ElectroPro Sousse",
                matriculeFiscal: "9876543/C/N/002",
                adresse: "8 Rue de la Liberté",
                ville: "Sousse",
                codePostal: "4000",
                telephone: "+216 73 890 123",
                email: "sales@electropro.tn",
                assujettTVA: false,
                exonereTVA: true,
                tauxRetenue: 2,
                devise: "EUR",
                deviseSecondaire: "TND",
                isClient: true,
                isFournisseur: false,
            },
        }),
        prisma.tiers.create({
            data: {
                code: "ME",
                raisonSociale: "MediCare Bizerte",
                matriculeFiscal: "5432198/D/M/003",
                adresse: "12 Avenue de la République",
                ville: "Bizerte",
                codePostal: "7000",
                telephone: "+216 72 456 789",
                email: "admin@medicare.tn",
                assujettTVA: true,
                tauxRetenue: 0,
                isClient: true,
                isFournisseur: false,
            },
        }),
        prisma.tiers.create({
            data: {
                code: "TE",
                raisonSociale: "TechVision Monastir",
                matriculeFiscal: "3210987/E/P/004",
                adresse: "56 Rue Ibn Khaldoun",
                ville: "Monastir",
                codePostal: "5000",
                telephone: "+216 73 123 456",
                email: "info@techvision.tn",
                assujettTVA: true,
                tauxRetenue: 1,
                isClient: true,
                isFournisseur: false,
            },
        }),
    ]);

    const [sti, dssfax, electro, medicare, techvision] = clients;

    // Products
    const [catInfo, catPape, catServ, catAccess] = await Promise.all([
        prisma.categorie.create({ data: { nom: "Informatique" } }),
        prisma.categorie.create({ data: { nom: "Papeterie" } }),
        prisma.categorie.create({ data: { nom: "Services" } }),
        prisma.categorie.create({ data: { nom: "Accessoires" } }),
    ]);

    const [marqueHP, marqueDell, marqueSamsung, marqueSanDisk] = await Promise.all([
        prisma.marque.create({ data: { nom: "HP" } }),
        prisma.marque.create({ data: { nom: "Dell" } }),
        prisma.marque.create({ data: { nom: "Samsung" } }),
        prisma.marque.create({ data: { nom: "SanDisk" } }),
    ]);

    const products = await Promise.all([
        prisma.product.create({
            data: {
                code: "PC-001",
                nom: "Ordinateur Portable HP",
                description: "HP EliteBook 840 G9 - Intel Core...",
                categorieId: catInfo.id,
                marqueId: marqueHP.id,
                prixHT: 2850,
                tauxTVA: 19,
                fodec: false,
                stockActuel: 15,
                stockMinimum: 3,
                unite: "Pièce",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "IMP-002",
                nom: "Imprimante Laser Samsung",
                description: "Samsung ML-2160 Mono",
                categorieId: catInfo.id,
                marqueId: marqueSamsung.id,
                prixHT: 450,
                tauxTVA: 19,
                fodec: true,
                tauxFodec: 1,
                stockActuel: 8,
                stockMinimum: 2,
                unite: "Pièce",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "ECR-003",
                nom: "Écran LED 24 pouces",
                description: "Dell U2422H IPS 24",
                categorieId: catInfo.id,
                marqueId: marqueDell.id,
                prixHT: 780,
                tauxTVA: 19,
                fodec: false,
                stockActuel: 12,
                stockMinimum: 2,
                unite: "Pièce",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "PAP-004",
                nom: "Ramette Papier A4 80g",
                description: "500 feuilles",
                categorieId: catPape.id,
                prixHT: 12.5,
                tauxTVA: 7,
                fodec: false,
                stockActuel: 200,
                stockMinimum: 20,
                unite: "Ramette",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "STL-005",
                nom: "Stylo Bille BIC Cristal",
                description: "Boîte de 50 pièces",
                categorieId: catPape.id,
                prixHT: 18.75,
                tauxTVA: 7,
                fodec: false,
                stockActuel: 45,
                stockMinimum: 10,
                unite: "Boîte",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "SRV-001",
                nom: "Maintenance Informatique",
                description: "Service de maintenance annuel",
                categorieId: catServ.id,
                prixHT: 1200,
                tauxTVA: 19,
                fodec: false,
                stockActuel: 999,
                stockMinimum: 0,
                unite: "Forfait",
                stockStatus: StockStatus.OK,
            },
        }),
        prisma.product.create({
            data: {
                code: "USB-006",
                nom: "Clé USB 64GB SanDisk",
                description: "SanDisk Ultra USB 3.0",
                categorieId: catInfo.id,
                marqueId: marqueSanDisk.id,
                prixHT: 35,
                tauxTVA: 19,
                fodec: true,
                tauxFodec: 1,
                stockActuel: 3,
                stockMinimum: 5,
                unite: "Pièce",
                stockStatus: StockStatus.CRITIQUE,
            },
        }),
        prisma.product.create({
            data: {
                code: "CAB-007",
                nom: "Câble HDMI 2M",
                description: "Câble HDMI 2.0 4K",
                categorieId: catAccess.id,
                prixHT: 22,
                tauxTVA: 19,
                fodec: false,
                stockActuel: 30,
                stockMinimum: 5,
                unite: "Pièce",
                stockStatus: StockStatus.OK,
            },
        }),
    ]);

    const [pc, imp, ecran, papier, stylo, srv, usb, hdmi] = products;

    // ─── Chaussures de sécurité (scraped from factory-trade.com) ───
    const catChaussures = await prisma.categorie.create({ data: { nom: "Chaussures de sécurité" } });

    const chaussures = await Promise.all([
        prisma.product.create({
            data: { code: "SEC-001", nom: "Botte de sécurité Classic S3", description: "Botte de sécurité Classic 3, avec semelle intérieure anti-perforation et embout de protection métalliques. La coupe est composée de cuir hydrofuge noir avec des détails en rouge et gris. Confortable et robuste, pour la construction et l'industrie.", categorieId: catChaussures.id, prixHT: 145, tauxTVA: 19, stockActuel: 50, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-002", nom: "BURAN S3", description: "Chaussure de sécurité basse, en MICROWASH épaisseur 1,8-2,0 mm. Doublure en tissu hautement respirante et résistante à l'abrasion. Chaussure avec insert haute visibilité. Languette souple, doublée et matelassée. CHAUSSURE SANS PARTIES METALLIQUES.", categorieId: catChaussures.id, prixHT: 135, tauxTVA: 19, stockActuel: 50, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-003", nom: "SHAMAL S3", description: "Chaussure de sécurité montante haut de gamme, norme S3. Tige en cuir hydrofuge, doublure respirante, embout composite et semelle anti-perforation.", categorieId: catChaussures.id, prixHT: 155, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-004", nom: "LIPARI S1PL FO SR", description: "Chaussure basse perforée, en tissu technique MICRO-TECH épaisseur 1,8-2,0 mm. Doublure en tissu très résistant à la transpiration et à l'abrasion. Chaussure avec insert en tissu réfractaire. CHAUSSURE SANS PARTIES METALLIQUES.", categorieId: catChaussures.id, prixHT: 125, tauxTVA: 19, stockActuel: 30, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-005", nom: "POLO S2", description: "Chaussure de sécurité basse norme S2. Tige en cuir blanc hydrofuge, doublure respirante, embout de protection. Idéale pour les environnements secs et propres.", categorieId: catChaussures.id, prixHT: 95, tauxTVA: 19, stockActuel: 45, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-006", nom: "OXFORD S3", description: "Chaussure de sécurité montante, en cuir WRU épaisseur 1,8-2,0 mm. Doublure en tissu respirante et résistante à l'abrasion. Chaussure avec insert haute visibilité. Languette souple, doublée et matelassée.", categorieId: catChaussures.id, prixHT: 140, tauxTVA: 19, stockActuel: 35, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-007", nom: "ANETO S3L FO SR", description: "Chaussure basse norme S3 avec embout composite. Tige en tissu technique respirant, doublure confortable, semelle antistatique et anti-dérapante. Sans métal.", categorieId: catChaussures.id, prixHT: 130, tauxTVA: 19, stockActuel: 25, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-008", nom: "TRIVOR S3L FO SR", description: "Chaussure montante S3 sans métal. Tige en MICRO-TECH, embout composite, semelle anti-perforation flexible. Confort optimal pour longue utilisation.", categorieId: catChaussures.id, prixHT: 150, tauxTVA: 19, stockActuel: 20, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-009", nom: "Lolita S3", description: "Chaussure de sécurité basse en microfibre de type nubuck hydrofuge. Tige micro-nabuccatino hydro. Première de propreté EVERDRY. Embout 200J non métallique Unicomp. Semelle Italia PU.", categorieId: catChaussures.id, prixHT: 120, tauxTVA: 19, stockActuel: 30, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-010", nom: "UNIMAX S3 WR CI SRC", description: "Bottes de sécurité fourrées homme. Tige cuir gras pleine fleur hydrofuge, fourrées laine avec membrane et inserts isothermes. Semelle de propreté GIOVE. Embout non métallique UNICOMP 200J. Semelle anti-perforation Armateak. 0% Métal.", categorieId: catChaussures.id, prixHT: 175, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-011", nom: "Jackson S3", description: "Chaussure de sécurité montante S3 en microfibre hydrofuge. Embout composite, semelle anti-perforation. Confort et robustesse pour les environnements exigeants.", categorieId: catChaussures.id, prixHT: 135, tauxTVA: 19, stockActuel: 25, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-012", nom: "STELLA S2", description: "Chaussure de sécurité basse en cuir blanc norme S2. Tige en cuir hydrofuge blanc, doublure respirante, embout de protection. Usage intérieur et sec.", categorieId: catChaussures.id, prixHT: 90, tauxTVA: 19, stockActuel: 35, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-013", nom: "MICRO S3 CI", description: "Chaussure basse S3 en microfibre technique. Embort composite isolant contre le froid, semelle anti-perforation, doublure chaude. Idéale pour environnements froids.", categorieId: catChaussures.id, prixHT: 145, tauxTVA: 19, stockActuel: 20, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-014", nom: "PERLA SB A E FO", description: "Sabot avec embout composite ESD S1 SRC. Léger, confortable et antistatique. Idéal pour les environnements électroniques et industriels propres.", categorieId: catChaussures.id, prixHT: 80, tauxTVA: 19, stockActuel: 50, stockMinimum: 10, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-015", nom: "DUSKY S3 CI", description: "Chaussure montante S3 avec isolation contre le froid. Tige en cuir hydrofuge, doublure chaude, embout composite isolant. Pour travaux en extérieur par temps froid.", categorieId: catChaussures.id, prixHT: 155, tauxTVA: 19, stockActuel: 15, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-016", nom: "ONYX S3", description: "Chaussure de sécurité basse S3 en cuir hydrofuge noir. Embout acier, semelle anti-perforation métallique, semelle extérieure antidérapante. Robuste et économique.", categorieId: catChaussures.id, prixHT: 110, tauxTVA: 19, stockActuel: 60, stockMinimum: 10, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-017", nom: "Returne S3 CI", description: "Chaussure montante S3 en microfibre grise avec isolation contre le froid. Embout composite, semelle anti-perforation, doublure chaude. Légère et isolante.", categorieId: catChaussures.id, prixHT: 150, tauxTVA: 19, stockActuel: 20, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-018", nom: "BLANCO S2", description: "Chaussure de sécurité basse en cuir blanc, norme S2. Tige blanche hydrofuge, embout de protection, semelle antistatique. Pour secteurs alimentaire et médical.", categorieId: catChaussures.id, prixHT: 95, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-019", nom: "ARAL S3 SRC", description: "Chaussure basse S3 en cuir marron hydrofuge. Embout composite non-métallique, semelle anti-perforation, antidérapante SRC. Confortable pour usage quotidien.", categorieId: catChaussures.id, prixHT: 130, tauxTVA: 19, stockActuel: 25, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-020", nom: "Botte PVC", description: "Botte en PVC blanc, norme de sécurité. Légère, résistante aux produits chimiques et à l'eau. Idéale pour les environnements humides et l'industrie agroalimentaire.", categorieId: catChaussures.id, prixHT: 65, tauxTVA: 19, stockActuel: 100, stockMinimum: 20, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-021", nom: "ANETE S3", description: "Chaussure basse S3 en microfibre noire hydrofuge. Embout composite, semelle anti-perforation textile, semelle extérieure PU antidérapante. Légère et flexible.", categorieId: catChaussures.id, prixHT: 125, tauxTVA: 19, stockActuel: 30, stockMinimum: 3, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-022", nom: "Botte PVC S5-SRC", description: "Botte en PVC jaune norme S5-SRC. Embout de sécurité, semelle anti-perforation, résistance aux hydrocarbures. Haute visibilité pour travaux extérieurs.", categorieId: catChaussures.id, prixHT: 85, tauxTVA: 19, stockActuel: 80, stockMinimum: 10, unite: "Paire", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "SEC-023", nom: "Sabot avec embout composite ESD S1 SRC", description: "Sabot de sécurité avec embout composite, antistatique ESD, norme S1 SRC. Léger, confortable, idéal pour laboratoires, électronique et industries propres.", categorieId: catChaussures.id, prixHT: 75, tauxTVA: 19, stockActuel: 60, stockMinimum: 10, unite: "Paire", stockStatus: StockStatus.OK },
        }),
    ]);

    const [classic, buran, shamal, lipari, polo, oxford, aneto, trivor, lolita, unimax, jackson, stella, micro, perla, dusky, onyx, returne, blanco, aral, bottePvc, anete, bottePvcS5, sabot] = chaussures;
    void classic, buran, shamal, lipari, polo, oxford, aneto, trivor, lolita, unimax, jackson, stella, micro, perla, dusky, onyx, returne, blanco, aral, bottePvc, anete, bottePvcS5, sabot;
    // ─── end Chaussures ───

    // ─── Vêtements de Travail (scraped from factory-trade.com) ───
    const catVetements = await prisma.categorie.create({ data: { nom: "Vêtements de Travail" } });

    const vetements = await Promise.all([
        prisma.product.create({
            data: { code: "VET-001", nom: "Blouse Antistatique ESD", description: "Blouse antistatique avec boutons pressions dissimulés, 2 poches plaquées, poche poitrine et poignets ajustables. Idéale pour environnements ESD. EN 61340-5-1. Tissu 65% polyester, 34% coton, 1% fibre conductrice 210g.", categorieId: catVetements.id, prixHT: 65, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-002", nom: "Parka Multiforme Fuzz", description: "Veste multinorme homme avec fermeture zippée et rabat velcro. Col montant, 2 poches poitrine avec rabat velcro, réglage poignets velcro. 99% coton, 1% fibre antistatique, 260 g/m².", categorieId: catVetements.id, prixHT: 180, tauxTVA: 19, stockActuel: 25, stockMinimum: 3, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-003", nom: "Pantalon Multirisques", description: "Pantalon multirisques avec ceinture élastiquée, 2 poches latérales à rabat, poches cuisse asymétriques, 2 poches dos, bandes rétroréfléchissantes, renforts genoux certifiés EN 14404, genoux préformés.", categorieId: catVetements.id, prixHT: 95, tauxTVA: 19, stockActuel: 35, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-004", nom: "Blouse Standard", description: "Blouse de travail standard, coupe classique, confortable et résistante pour un usage professionnel quotidien.", categorieId: catVetements.id, prixHT: 35, tauxTVA: 19, stockActuel: 50, stockMinimum: 10, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-005", nom: "Parka Max Vivo", description: "Parka professionnelle noire, chaude et résistante. Idéale pour les travaux en extérieur par temps froid.", categorieId: catVetements.id, prixHT: 165, tauxTVA: 19, stockActuel: 20, stockMinimum: 3, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-006", nom: "Combinaison anti-chimique", description: "Combinaison anti-chimique Spacel 4000. Protection contre les produits chimiques liquides. Idéale pour l'industrie chimique et le nettoyage industriel.", categorieId: catVetements.id, prixHT: 45, tauxTVA: 19, stockActuel: 60, stockMinimum: 10, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-007", nom: "Pantalon Poches Genouillères", description: "Pantalon de travail avec poches genouillères renforcées, multiples poches pour outils, idéal pour les métiers du bâtiment et de l'industrie.", categorieId: catVetements.id, prixHT: 75, tauxTVA: 19, stockActuel: 30, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-008", nom: "Blouse Unisexe Poly-Viscose", description: "Blouse unisexe en poly-viscose, coupe professionnelle, facile d'entretien. Idéale pour les secteurs médicaux, laboratoires et services.", categorieId: catVetements.id, prixHT: 40, tauxTVA: 19, stockActuel: 45, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-009", nom: "Parka GETACHE RFLX", description: "Parka GETACHE avec bandes rétroréfléchissantes pour une meilleure visibilité. Chaude, confortable et résistante pour travaux extérieurs.", categorieId: catVetements.id, prixHT: 175, tauxTVA: 19, stockActuel: 15, stockMinimum: 3, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-010", nom: "Gilet Haute Visibilité", description: "Gilet haute visibilité EN ISO 20471 classe 2. Tissu fluorescent avec 2 bandes rétroréfléchissantes de 5cm. Fermeture scratchée. Taille unique. Idéal BTP, transport et logistique.", categorieId: catVetements.id, prixHT: 15, tauxTVA: 19, stockActuel: 120, stockMinimum: 20, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-011", nom: "Pantalon 5 Poches Essentiels", description: "Pantalon de travail 5 poches coupe classique, tissu résistant, confortable pour un usage professionnel quotidien.", categorieId: catVetements.id, prixHT: 55, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-012", nom: "Blouse Agroalimentaire", description: "Blouse agroalimentaire blanche, coupe homme ou femme, facile d'entretien. Conçue pour les environnements alimentaires et industriels.", categorieId: catVetements.id, prixHT: 38, tauxTVA: 19, stockActuel: 50, stockMinimum: 10, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-013", nom: "Parka MAX NEO Pilot", description: "Parka professionnelle chaude avec capuche, idéale pour les environnements extérieurs exigeants. Tissu résistant et coupe fonctionnelle.", categorieId: catVetements.id, prixHT: 195, tauxTVA: 19, stockActuel: 18, stockMinimum: 3, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-014", nom: "Parka Haute Visibilité Basique", description: "Parka haute visibilité basique avec bandes réfléchissantes. Chaude et imperméable, idéale pour les travaux extérieurs par mauvais temps.", categorieId: catVetements.id, prixHT: 85, tauxTVA: 19, stockActuel: 30, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-015", nom: "Kit de Travail 488 CCR/PCR", description: "Kit de travail complet 488 CCR/PCR comprenant veste et pantalon haute visibilité. Ensemble professionnel pour les environnements exigeants.", categorieId: catVetements.id, prixHT: 140, tauxTVA: 19, stockActuel: 20, stockMinimum: 3, unite: "Kit", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-016", nom: "Parka HV SOFTSHELL", description: "Parka haute visibilité softshell, coupe-vent et imperméable. Chaude et confortable avec bandes réfléchissantes. Idéale pour les professionnels.", categorieId: catVetements.id, prixHT: 155, tauxTVA: 19, stockActuel: 22, stockMinimum: 3, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-017", nom: "Kit Pluie Ingénieur", description: "Kit pluie complet pour ingénieur, veste et pantalon imperméables. Protection efficace contre la pluie et les intempéries sur les chantiers.", categorieId: catVetements.id, prixHT: 60, tauxTVA: 19, stockActuel: 35, stockMinimum: 5, unite: "Kit", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-018", nom: "Pantalon Prestige", description: "Pantalon de travail Prestige, coupe élégante et professionnelle. Tissu résistant, confortable pour un usage quotidien en milieu professionnel.", categorieId: catVetements.id, prixHT: 65, tauxTVA: 19, stockActuel: 30, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-019", nom: "Manteau de Pluie Polyester Enduit Double Face PVC", description: "Manteau de pluie en polyester enduit double face PVC. Imperméable et résistant, idéal pour les travaux en extérieur par temps de pluie.", categorieId: catVetements.id, prixHT: 45, tauxTVA: 19, stockActuel: 40, stockMinimum: 5, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-020", nom: "Ensemble de Pluie Polyester Enduit PVC P400", description: "Ensemble de pluie veste+pantalon en polyester enduit PVC P400. Imperméable, résistant, idéal pour les professionnels travaillant sous la pluie.", categorieId: catVetements.id, prixHT: 55, tauxTVA: 19, stockActuel: 35, stockMinimum: 5, unite: "Kit", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-021", nom: "Combinaison DT117 5B/6B", description: "Combinaison de protection DT117 catégorie 5B/6B. Jetable, légère, protection contre les particules dangereuses et les produits chimiques légers.", categorieId: catVetements.id, prixHT: 25, tauxTVA: 19, stockActuel: 80, stockMinimum: 20, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
        prisma.product.create({
            data: { code: "VET-022", nom: "Combinaison C0600", description: "Combinaison de travail C0600, résistante et confortable. Idéale pour les travaux industriels, la maintenance et l'entretien.", categorieId: catVetements.id, prixHT: 30, tauxTVA: 19, stockActuel: 60, stockMinimum: 10, unite: "Pièce", stockStatus: StockStatus.OK },
        }),
    ]);

    // ─── end Vêtements de Travail ───

    // ─── Fournisseurs ──────────────────────────────────────────────────────
    const [fournisseurUSP, fournisseurAMOUS, ftFabrication, fournisseurInfo, fournisseurPapeterie, fournisseurPresta] =
        await Promise.all([
            prisma.tiers.create({
                data: {
                    code: "USP",
                    raisonSociale: "USP",
                    matriculeFiscal: "8811001/A/M/100",
                    adresse: "Zone Industrielle Charguia II",
                    ville: "Tunis",
                    codePostal: "2035",
                    telephone: "+216 70 555 100",
                    email: "contact@usp.tn",
                    assujettTVA: true,
                    tauxRetenue: 1,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
            prisma.tiers.create({
                data: {
                    code: "AMOUS",
                    raisonSociale: "AMOUS",
                    matriculeFiscal: "8811002/A/M/101",
                    adresse: "Route de la Soukra",
                    ville: "Tunis",
                    codePostal: "2036",
                    telephone: "+216 70 555 101",
                    email: "contact@amous.tn",
                    assujettTVA: true,
                    tauxRetenue: 1,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
            prisma.tiers.create({
                data: {
                    code: "FT-FAB",
                    raisonSociale: "Factory Trade (Fabrication)",
                    matriculeFiscal: "1756917/L/A/M/001",
                    adresse: "Avenie de l'environement",
                    ville: "Grombalia",
                    codePostal: "8030",
                    telephone: "+216 72 256 709",
                    email: "production@factory-trade.com",
                    assujettTVA: true,
                    tauxRetenue: 0,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
            prisma.tiers.create({
                data: {
                    code: "FOU-INFO",
                    raisonSociale: "Fournisseur Informatique SA",
                    matriculeFiscal: "8811003/A/M/102",
                    adresse: "13 Rue de la Technologie",
                    ville: "La Marsa",
                    codePostal: "2078",
                    telephone: "+216 71 777 200",
                    email: "ventes@fouinfo.tn",
                    assujettTVA: true,
                    tauxRetenue: 1,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
            prisma.tiers.create({
                data: {
                    code: "FOU-PAP",
                    raisonSociale: "Papeterie & Fournitures",
                    matriculeFiscal: "8811004/A/M/103",
                    adresse: "7 Rue de la Presse",
                    ville: "Tunis",
                    codePostal: "1002",
                    telephone: "+216 71 888 300",
                    email: "commandes@foupap.tn",
                    assujettTVA: true,
                    tauxRetenue: 0,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
            prisma.tiers.create({
                data: {
                    code: "FOU-SRV",
                    raisonSociale: "PrestaTech Maintenance",
                    matriculeFiscal: "8811005/A/M/104",
                    adresse: "25 Avenue de la République",
                    ville: "Nabeul",
                    codePostal: "8000",
                    telephone: "+216 72 999 400",
                    email: "contact@prestatech.tn",
                    assujettTVA: true,
                    tauxRetenue: 2,
                    isClient: false,
                    isFournisseur: true,
                },
            }),
        ]);

    // ─── Affectation du fournisseur par produit ─────────────────────────────
    await Promise.all(
        chaussures.map((p, i) =>
            prisma.product.update({
                where: { id: p.id },
                data: { tiersId: i % 2 === 0 ? fournisseurUSP.id : fournisseurAMOUS.id },
            })
        )
    );
    await Promise.all(
        vetements.map((p) =>
            prisma.product.update({ where: { id: p.id }, data: { tiersId: ftFabrication.id } })
        )
    );
    await Promise.all(
        [pc, imp, ecran, usb, hdmi].map((p) =>
            prisma.product.update({ where: { id: p.id }, data: { tiersId: fournisseurInfo.id } })
        )
    );
    await Promise.all(
        [papier, stylo].map((p) =>
            prisma.product.update({ where: { id: p.id }, data: { tiersId: fournisseurPapeterie.id } })
        )
    );
    await prisma.product.update({ where: { id: srv.id }, data: { tiersId: fournisseurPresta.id } });

    // ─── Achats : factures + BL pour tous les produits ──────────────────────
    interface AchatDef {
        product: { id: string; nom: string };
        prixHT: number;
        tauxTVA: number;
        quantite: number;
        facteurPrix: number;
        fournisseurId: string;
    }

    const buildAchatLine = (
        product: { id: string; nom: string },
        prixHT: number,
        tauxTVA: number,
        quantite: number,
        facteurPrix: number,
        ordre: number
    ) => {
        const prixAchat = Math.round(prixHT * facteurPrix * 100) / 100;
        const totalHT = Math.round(prixAchat * quantite * 100) / 100;
        return {
            productId: product.id,
            description: product.nom,
            quantite,
            prixAchat,
            remise: 0,
            tauxTVA,
            totalHT,
            ordre,
        };
    };

    const achatDefs: AchatDef[] = [
        ...chaussures.map((p, i) => ({
            product: { id: p.id, nom: p.nom },
            prixHT: Number(p.prixHT),
            tauxTVA: Number(p.tauxTVA),
            quantite: 20,
            facteurPrix: 0.52,
            fournisseurId: i % 2 === 0 ? fournisseurUSP.id : fournisseurAMOUS.id,
        })),
        ...vetements.map((p) => ({
            product: { id: p.id, nom: p.nom },
            prixHT: Number(p.prixHT),
            tauxTVA: Number(p.tauxTVA),
            quantite: 15,
            facteurPrix: 0.45,
            fournisseurId: ftFabrication.id,
        })),
        ...[pc, imp, ecran, usb, hdmi].map((p) => ({
            product: { id: p.id, nom: p.nom },
            prixHT: Number(p.prixHT),
            tauxTVA: Number(p.tauxTVA),
            quantite: 5,
            facteurPrix: 0.75,
            fournisseurId: fournisseurInfo.id,
        })),
        ...[papier, stylo].map((p) => ({
            product: { id: p.id, nom: p.nom },
            prixHT: Number(p.prixHT),
            tauxTVA: Number(p.tauxTVA),
            quantite: 30,
            facteurPrix: 0.6,
            fournisseurId: fournisseurPapeterie.id,
        })),
        {
            product: { id: srv.id, nom: srv.nom },
            prixHT: Number(srv.prixHT),
            tauxTVA: Number(srv.tauxTVA),
            quantite: 1,
            facteurPrix: 0.4,
            fournisseurId: fournisseurPresta.id,
        },
    ];

    const defsByFournisseur = new Map<string, AchatDef[]>();
    for (const def of achatDefs) {
        const arr = defsByFournisseur.get(def.fournisseurId) ?? [];
        arr.push(def);
        defsByFournisseur.set(def.fournisseurId, arr);
    }

    const createAchat = async (opts: {
        numero: string;
        tiersId: string;
        type: AchatType;
        dateFacture: Date;
        dateEcheance: Date | null;
        referenceFournisseur: string;
        lines: ReturnType<typeof buildAchatLine>[];
    }) => {
        const totalHT = Math.round(opts.lines.reduce((s, l) => s + l.totalHT, 0) * 100) / 100;
        const totalTVA = Math.round(opts.lines.reduce((s, l) => s + l.totalHT * (l.tauxTVA / 100), 0) * 100) / 100;
        const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;

        const achat = await prisma.achat.create({
            data: {
                numero: opts.numero,
                tiersId: opts.tiersId,
                companyId: company.id,
                dateFacture: opts.dateFacture,
                dateEcheance: opts.dateEcheance,
                referenceFournisseur: opts.referenceFournisseur,
                type: opts.type,
                baseHT: totalHT,
                totalHT,
                totalTVA,
                totalTTC,
                montantPaye: 0,
                resteAPayer: totalTTC,
                status: AchatStatus.VALIDEE,
                lines: { create: opts.lines },
            },
        });

        const movements = opts.lines.map((l) => ({
            productId: l.productId,
            type: MouvementType.ENTREE,
            quantite: l.quantite,
            referenceType: ReferenceType.ACHAT,
            referenceId: opts.numero,
            achatId: achat.id,
            date: opts.dateFacture,
        }));
        await prisma.stockMovement.createMany({ data: movements });
        for (const m of movements) {
            await prisma.product.update({
                where: { id: m.productId },
                data: { stockActuel: { increment: m.quantite } },
            });
        }

        console.log(`  ✅ ${opts.type} ${opts.numero} — ${opts.lines.length} lignes, TTC ${totalTTC} TND`);
    };

    let achatIndex = 1;
    let blaIndex = 1;
    for (const [fournisseurId, defs] of defsByFournisseur) {
        const factureLines = defs.map((d, i) =>
            buildAchatLine(d.product, d.prixHT, d.tauxTVA, d.quantite, d.facteurPrix, i + 1)
        );
        const blLines = defs.map((d, i) =>
            buildAchatLine(d.product, d.prixHT, d.tauxTVA, d.quantite, d.facteurPrix, i + 1)
        );

        const factureNumero = `ACH-2024-${String(achatIndex++).padStart(4, "0")}`;
        const blNumero = `BL-A-2024-${String(blaIndex++).padStart(4, "0")}`;

        await createAchat({
            numero: factureNumero,
            tiersId: fournisseurId,
            type: AchatType.FACTURE,
            dateFacture: new Date("2024-02-10"),
            dateEcheance: new Date("2024-03-12"),
            referenceFournisseur: `REF-${factureNumero}`,
            lines: factureLines,
        });
        await createAchat({
            numero: blNumero,
            tiersId: fournisseurId,
            type: AchatType.BL,
            dateFacture: new Date("2024-02-08"),
            dateEcheance: null,
            referenceFournisseur: `REF-${blNumero}`,
            lines: blLines,
        });
    }

    // Invoices
    const inv1 = await prisma.invoice.create({
        data: {
            numero: "FAC-2024-0001",
            tiersId: sti.id,
            companyId: company.id,
            dateEmission: new Date("2024-01-20"),
            dateEcheance: new Date("2024-02-20"),
            baseHT: 6975,
            totalHT: 6975,
            totalTVA: 1325.25,
            totalFodec: 0,
            totalRetenue: 104.625,
            totalTTC: 8300.25,
            montantPaye: 8300.25,
            resteAPayer: 0,
            status: InvoiceStatus.PAYEE,
            bcViseActif: true,
            bcViseNumero: "BC-2024-001",
            poids: 150.00,
            nbColis: 3,
            lines: {
                create: [
                    {
                        productId: pc.id,
                        description: "Ordinateur Portable HP EliteBook 840 G9",
                        quantite: 2,
                        prixHT: 2850,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 5700,
                        ordre: 1,
                    },
                    {
                        productId: ecran.id,
                        description: "Écran LED 24 pouces Dell U2422H",
                        quantite: 1,
                        prixHT: 780,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 780,
                        ordre: 2,
                    },
                    {
                        productId: hdmi.id,
                        description: "Câble HDMI 2M",
                        quantite: 2,
                        prixHT: 22,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 44,
                        ordre: 3,
                    },
                    {
                        productId: papier.id,
                        description: "Ramette Papier A4 80g",
                        quantite: 5,
                        prixHT: 12.5,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 62.5,
                        ordre: 4,
                    },
                    {
                        productId: stylo.id,
                        description: "Stylo Bille BIC Cristal (Boîte)",
                        quantite: 5,
                        prixHT: 18.75,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 93.75,
                        ordre: 5,
                    },
                    {
                        productId: usb.id,
                        description: "Clé USB 64GB SanDisk",
                        quantite: 5,
                        prixHT: 35,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 175,
                        ordre: 6,
                    },
                    {
                        productId: imp.id,
                        description: "Imprimante Laser Samsung ML-2160",
                        quantite: 1,
                        prixHT: 450,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 450,
                        ordre: 7,
                    },
                    {
                        productId: srv.id,
                        description: "Maintenance Informatique Annuelle",
                        quantite: 0.5,
                        prixHT: 1200,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 600,
                        ordre: 8,
                    },
                ],
            },
        },
    });

    const inv2 = await prisma.invoice.create({
        data: {
            numero: "FAC-2024-0002",
            tiersId: dssfax.id,
            companyId: company.id,
            dateEmission: new Date("2024-02-05"),
            dateEcheance: new Date("2024-03-05"),
            baseHT: 1365,
            totalHT: 1365,
            totalTVA: 259.35,
            totalFodec: 2.35,
            totalRetenue: 0,
            totalTTC: 1626.705,
            montantPaye: 800,
            resteAPayer: 826.705,
            status: InvoiceStatus.PARTIELLE,
            notes: "Paiement partiel reçu par chèque BNA",
            lines: {
                create: [
                    {
                        productId: imp.id,
                        description: "Imprimante Laser Samsung ML-2160",
                        quantite: 2,
                        prixHT: 450,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 900,
                        ordre: 1,
                    },
                    {
                        productId: usb.id,
                        description: "Clé USB 64GB SanDisk",
                        quantite: 5,
                        prixHT: 35,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 175,
                        ordre: 2,
                    },
                    {
                        productId: hdmi.id,
                        description: "Câble HDMI 2M",
                        quantite: 5,
                        prixHT: 22,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 110,
                        ordre: 3,
                    },
                    {
                        productId: papier.id,
                        description: "Ramette Papier A4 80g",
                        quantite: 10,
                        prixHT: 12.5,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 125,
                        ordre: 4,
                    },
                    {
                        productId: stylo.id,
                        description: "Stylo Bille BIC Cristal",
                        quantite: 3,
                        prixHT: 18.75,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 56.25,
                        ordre: 5,
                    },
                ],
            },
        },
    });

    const inv3 = await prisma.invoice.create({
        data: {
            numero: "FAC-2024-0003",
            tiersId: medicare.id,
            companyId: company.id,
            dateEmission: new Date("2024-02-15"),
            dateEcheance: new Date("2024-03-15"),
            baseHT: 5400,
            totalHT: 5400,
            totalTVA: 1026,
            totalFodec: 0,
            totalRetenue: 0,
            totalTTC: 6426,
            montantPaye: 0,
            resteAPayer: 6426,
            status: InvoiceStatus.EN_RETARD,
            lines: {
                create: [
                    {
                        productId: pc.id,
                        description: "Ordinateur Portable HP EliteBook",
                        quantite: 1,
                        prixHT: 2850,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 2850,
                        ordre: 1,
                    },
                    {
                        productId: ecran.id,
                        description: "Écran LED 24 pouces",
                        quantite: 2,
                        prixHT: 780,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 1560,
                        ordre: 2,
                    },
                    {
                        productId: srv.id,
                        description: "Maintenance Informatique",
                        quantite: 0.75,
                        prixHT: 1200,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 900,
                        ordre: 3,
                    },
                ],
            },
        },
    });

    const inv4 = await prisma.invoice.create({
        data: {
            numero: "FAC-2024-0004",
            tiersId: techvision.id,
            companyId: company.id,
            dateEmission: new Date("2024-03-01"),
            dateEcheance: new Date("2024-04-01"),
            baseHT: 2934.45,
            totalHT: 2934.45,
            totalTVA: 557.346,
            totalFodec: 4.5,
            totalRetenue: 3.5,
            totalTTC: 3492.796,
            montantPaye: 0,
            resteAPayer: 3492.796,
            status: InvoiceStatus.ENVOYEE,
            lines: {
                create: [
                    {
                        productId: pc.id,
                        description: "Ordinateur Portable HP",
                        quantite: 1,
                        prixHT: 2850,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 2850,
                        ordre: 1,
                    },
                    {
                        productId: usb.id,
                        description: "Clé USB 64GB SanDisk",
                        quantite: 2,
                        prixHT: 35,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 70,
                        ordre: 2,
                    },
                    {
                        productId: hdmi.id,
                        description: "Câble HDMI 2M",
                        quantite: 2,
                        prixHT: 22,
                        remise: 5,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 41.8,
                        ordre: 3,
                    },
                ],
            },
        },
    });

    const inv5 = await prisma.invoice.create({
        data: {
            numero: "FAC-2024-0005",
            tiersId: electro.id,
            companyId: company.id,
            dateEmission: new Date("2024-03-10"),
            dateEcheance: new Date("2024-04-10"),
            baseHT: 735,
            totalHT: 735,
            totalTVA: 130.5,
            totalFodec: 3.5,
            totalRetenue: 0,
            totalTTC: 869.0,
            montantPaye: 0,
            resteAPayer: 869.0,
            status: InvoiceStatus.BROUILLON,
            lines: {
                create: [
                    {
                        productId: imp.id,
                        description: "Imprimante Laser Samsung",
                        quantite: 1,
                        prixHT: 450,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 450,
                        ordre: 1,
                    },
                    {
                        productId: ecran.id,
                        description: "Écran LED 24 pouces",
                        quantite: 0.5,
                        prixHT: 780,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 390,
                        ordre: 2,
                    },
                    {
                        productId: stylo.id,
                        description: "Stylo Bille BIC Cristal",
                        quantite: 2,
                        prixHT: 18.75,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 37.5,
                        ordre: 3,
                    },
                ],
            },
        },
    });

    // Payment for invoice 1
    await prisma.payment.create({
        data: {
            invoiceId: inv1.id,
            tiersId: sti.id,
            montant: 8300.25,
            methode: PaymentMethod.VIREMENT,
            reference: "VIR-2024-001",
            dateReglement: new Date("2024-02-18"),
            notes: "Virement bancaire reçu",
            companyId: company.id,
        },
    });

    // Payment for invoice 2 (partial)
    await prisma.payment.create({
        data: {
            invoiceId: inv2.id,
            tiersId: dssfax.id,
            montant: 800,
            methode: PaymentMethod.VIREMENT,
            reference: "VIR-0123456",
            dateReglement: new Date("2024-02-20"),
            notes: "Virement bancaire",
            companyId: company.id,
        },
    });

    // Quotes
    await prisma.quote.create({
        data: {
            numero: "DEV-2024-0001",
            tiersId: sti.id,
            companyId: company.id,
            dateCreation: new Date("2024-01-15"),
            dateExpiration: new Date("2024-02-15"),
            baseHT: 5415,
            totalHT: 5415,
            totalTVA: 1028.85,
            totalFodec: 0,
            totalTTC: 6443.85,
            status: QuoteStatus.FACTUREE,
            invoiceId: inv1.id,
            lines: {
                create: [
                    {
                        productId: pc.id,
                        description: "Ordinateur Portable HP EliteBook 840",
                        quantite: 1,
                        prixHT: 2850,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 2850,
                        ordre: 1,
                    },
                    {
                        productId: srv.id,
                        description: "Maintenance Informatique 1 an",
                        quantite: 2,
                        prixHT: 1200,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 2400,
                        ordre: 2,
                    },
                    {
                        productId: hdmi.id,
                        description: "Câble HDMI 2M",
                        quantite: 5,
                        prixHT: 22,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 110,
                        ordre: 3,
                    },
                    {
                        productId: usb.id,
                        description: "Clé USB 64GB",
                        quantite: 1,
                        prixHT: 35,
                        remise: 5,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 33.25,
                        ordre: 4,
                    },
                    {
                        productId: papier.id,
                        description: "Ramette Papier A4",
                        quantite: 10,
                        prixHT: 12.5,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 125,
                        ordre: 5,
                    },
                    {
                        productId: stylo.id,
                        description: "Stylo Bille BIC",
                        quantite: 5,
                        prixHT: 18.75,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 93.75,
                        ordre: 6,
                    },
                ],
            },
        },
    });

    await prisma.quote.create({
        data: {
            numero: "DEV-2024-0002",
            tiersId: electro.id,
            companyId: company.id,
            dateCreation: new Date("2024-03-05"),
            dateExpiration: new Date("2024-04-05"),
            baseHT: 3600,
            totalHT: 3600,
            totalTVA: 684,
            totalFodec: 0,
            totalTTC: 4284,
            status: QuoteStatus.ENVOYEE,
            lines: {
                create: [
                    {
                        productId: srv.id,
                        description: "Maintenance Informatique Annuelle",
                        quantite: 3,
                        prixHT: 1200,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 3600,
                        ordre: 1,
                    },
                ],
            },
        },
    });

    await prisma.quote.create({
        data: {
            numero: "DEV-2024-0003",
            tiersId: techvision.id,
            companyId: company.id,
            dateCreation: new Date("2024-03-20"),
            dateExpiration: new Date("2024-04-20"),
            baseHT: 2050,
            totalHT: 2050,
            totalTVA: 389.5,
            totalFodec: 0.5,
            totalTTC: 2440.0,
            status: QuoteStatus.BROUILLON,
            lines: {
                create: [
                    {
                        productId: pc.id,
                        description: "Ordinateur Portable HP",
                        quantite: 0.5,
                        prixHT: 2850,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 1425,
                        ordre: 1,
                    },
                    {
                        productId: ecran.id,
                        description: "Écran LED 24 pouces",
                        quantite: 0.5,
                        prixHT: 780,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 390,
                        ordre: 2,
                    },
                    {
                        productId: usb.id,
                        description: "Clé USB 64GB",
                        quantite: 3,
                        prixHT: 35,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 105,
                        ordre: 3,
                    },
                    {
                        productId: hdmi.id,
                        description: "Câble HDMI 2M",
                        quantite: 3,
                        prixHT: 22,
                        remise: 10,
                        tauxTVA: 19,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 59.4,
                        ordre: 4,
                    },
                    {
                        productId: imp.id,
                        description: "Imprimante Laser Samsung",
                        quantite: 0.05,
                        prixHT: 450,
                        remise: 0,
                        tauxTVA: 19,
                        fodec: true,
                        tauxFodec: 1,
                        totalHT: 22.5,
                        ordre: 5,
                    },
                    {
                        productId: papier.id,
                        description: "Ramette Papier A4",
                        quantite: 3,
                        prixHT: 12.5,
                        remise: 0,
                        tauxTVA: 7,
                        fodec: false,
                        tauxFodec: 1,
                        totalHT: 37.5,
                        ordre: 6,
                    },
                ],
            },
        },
    });

    // Cheques
    await prisma.cheque.create({
        data: {
            numero: "0123456",
            banque: "BNA",
            type: ChequeType.RECU,
            tiersId: dssfax.id,
            beneficiaire: "Distributions Sfax SARL",
            montant: 800,
            dateEmission: new Date("2024-02-20"),
            dateEcheance: new Date("2024-03-20"),
            status: ChequeStatus.EN_ATTENTE,
            companyId: company.id,
        },
    });

    await prisma.cheque.create({
        data: {
            numero: "1213141",
            banque: "Attijari",
            type: ChequeType.RECU,
            tiersId: medicare.id,
            beneficiaire: "MediCare Bizerte",
            montant: 1200,
            dateEmission: new Date("2024-03-10"),
            dateEcheance: new Date("2024-04-10"),
            status: ChequeStatus.EN_ATTENTE,
            companyId: company.id,
        },
    });

    await prisma.cheque.create({
        data: {
            numero: "9876543",
            banque: "BH",
            type: ChequeType.EMIS,
            beneficiaire: "Fournisseur Informatique SA",
            montant: 3500,
            dateEmission: new Date("2024-03-15"),
            dateEcheance: new Date("2024-04-15"),
            status: ChequeStatus.ENCAISSE,
            companyId: company.id,
        },
    });

    console.log("✅ Seed completed!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
