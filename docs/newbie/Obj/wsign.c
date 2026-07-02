/*
**  wsign.c -- wall sign, with weapons info -- Hannah 3/95
*/

inherit ThingCode;


void extra_create()
{
    set( "id", ({ "sign", "battered sign", "graffiti sign" }) );
    set( "short", "a battered, graffiti-covered sign" );
    set( "long",
      "This sign appears to be extremely beat up, with a few bullet holes " +
      "and spraypaint stains.\n" +
      "\n" +
      "            .----------------------------------------------------.\n" +
      "            |               WEAPON    RESTRICTION:               |\n" +
      "            |                                                    |\n" +
      "            |    NO weapon of very heavy damage, denser than     |\n" +
      "            |     steel (like lead or gold), with sharpness      |\n" +
      "            |   higher than what an average weaponsmith could    |\n" +
      "            |   achieve on a typical weapon, or with a special   |\n" +
      "            |         attack is allowed past this point!         |\n" +
      "            ^----------------------------------------------------^\n" +
      "                                     |  |\n");
    set( "gettable", 0 );
    set( "read", THISO->long() );
}
