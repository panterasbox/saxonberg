inherit RoomPlusCode;

void extra_create() {
  set( "short", "Dave's Throne Room");
  set( "day_long",
    "You have entered the throne room of Dave, the Dragon of Death.  You "
    "are in awe of the enormity of the room...sculpted pillars support a "
    "ceiling nearly one hundred feet high; the room itself is large enough "
    "to hold nearly ten thousand people.  At the south end of the room sits "
    "an enormous throne.  Atop the throne sits a colossally large golden "
    "statue of a dragon.\n\n"
    "    Rumor has it that Dave will occasionally respond to the dances of "
    "a mortal, rising to feast upon the soul of a mortal of their choosing.  "
    "You can \"dance\" for Dave if you wish, but beware!  The wrath of Dave "
    "is not easily satiated, nor does his favor come easily." );
    set( "exits", ([ "north": "/zone/null/eternal/room052" ]) );
    set( "descs", ([
      "throne":
        "It's a golden throne, about as big as your average castle.",
      "statue":
        "It's a finely crafted golden statue.  Someday you wish you had a house "+
        "half as large.  The Dragon depicted looks wise, yet terrifying."
    ]) );
    set( "day_light", WELL_LIT );
    set( NoCombatP, 1 );
}
