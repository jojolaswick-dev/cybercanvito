import WebFont from "webfontloader";

export const GOOGLE_FONTS = [
  "Roboto",
  "Montserrat",
  "Poppins",
  "Open Sans",
  "Lato",
  "Playfair Display",
  "Bebas Neue",
  "Pacifico",
  "Oswald",
  "Cinzel",
  "Inter",
  "Raleway",
  "Ubuntu",
  "Nunito",
  "Merriweather",
  "Mukta",
  "Quicksand",
  "Kanit",
  "Lora",
  "Fira Sans",
  "Josefin Sans",
  "Arvo",
  "Libre Baskerville",
  "Anton",
  "Abel",
  "Dancing Script",
  "Shadows Into Light",
  "Indie Flower",
  "Caveat",
  "Comfortaa",
  "Orbitron",
  "Righteous",
  "Permanent Marker",
  "Fredoka One",
  "Lobster",
  "Staatliches",
  "Abril Fatface",
  "Satisfy",
  "Patua One",
  "Cormorant Garamond",
];

export const loadGoogleFonts = () => {
  if (typeof window === "undefined") return;
  
  WebFont.load({
    google: {
      families: GOOGLE_FONTS,
    },
    active: () => {
      console.log("Google Fonts loaded successfully");
      // Trigger canvas re-render if needed globally, 
      // though Fabric objects will redraw on interaction
    },
  });
};
