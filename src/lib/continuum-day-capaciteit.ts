// Twee getallen voor Continuum Day, bewust uit elkaar getrokken.
//
// PUBLIEK_MAX is wat de buitenwereld ziet: de publieke teller loopt tot hier en
// blijft daarna op "VOL." staan, en het is het getal in alle communicatie en pers.
//
// INTERN_MAX is waar we echt stoppen met mensen automatisch toelaten. Dat ligt
// hoger omdat een gratis buitenevent altijd no-shows kent: wie zich aanmeldt en
// niet afmeldt, komt lang niet altijd opdagen. Overboeken is de enige manier om
// op de dag zelf daadwerkelijk in de buurt van PUBLIEK_MAX gitaristen te staan.
//
// Alleen het aanmeld-endpoint en het afgeschermde dashboard kennen INTERN_MAX.
// De publieke teller geeft nooit meer dan PUBLIEK_MAX terug.
// 8 sep 2026: van 250/300 naar 300/330. De eerste 250 waren in twee weken vergeven;
// in de laatste week kwamen de afmeldingen, dus we hebben er publiek 50 bij gemaakt
// zodat de site weer "plekken vrij" toont in plaats van VOL.
export const PUBLIEK_MAX = 300;
export const INTERN_MAX = 330;
