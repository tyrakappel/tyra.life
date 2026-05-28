export type BoardTemplateId = "empty" | "livshjul";

export type BoardTemplate = {
  id: BoardTemplateId;
  name: string;
  description: string;
  emoji: string;
  /** Initiala sektioner att skapa med boarden */
  sections: { title: string; description?: string; color?: string }[];
};

export const BOARD_TEMPLATES: Record<BoardTemplateId, BoardTemplate> = {
  empty: {
    id: "empty",
    name: "Starta med tomt board",
    description: "Bygg upp från scratch — lägg till sektioner själv",
    emoji: "📋",
    sections: [],
  },
  livshjul: {
    id: "livshjul",
    name: "Importera livshjul",
    description: "6 kategorier för att täcka livets viktigaste områden",
    emoji: "🎡",
    sections: [
      {
        title: "Ekonomi och karriär",
        description: "Arbete, ekonomi, sparande, mål",
        color: "#fcd34d",
      },
      {
        title: "Mental utveckling",
        description: "Lärande, kreativitet, fokus",
        color: "#93c5fd",
      },
      {
        title: "Hälsa och fysik",
        description: "Träning, kost, sömn, energi",
        color: "#86efac",
      },
      {
        title: "Social och kulturell",
        description: "Vänner, kultur, gemenskap",
        color: "#f0abfc",
      },
      {
        title: "Etisk och andlig",
        description: "Värderingar, mening, reflektion",
        color: "#a78bfa",
      },
      {
        title: "Hem och familj",
        description: "Bostad, närstående, vardag",
        color: "#fca5a5",
      },
    ],
  },
};
