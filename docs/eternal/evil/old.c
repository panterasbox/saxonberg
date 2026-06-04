inherit RoomPlusCode;
 
void extra_create()
  {
  set( "short", "Dave's Throne Room");
  set( "day_long", "You have entered the throne room of Dave, "
    "the Dragon of Death.  You are in awe of the enormity of "
    "the room...sculpted pillars support a ceiling nearly one "
    "hundred feet high; the room itself is large enough to hold "
    "nearly ten thousand people.  At the south end of the room "
    "sits an enormous throne.  The throne, as well as the rest "
    "of the room, is covered with a thick layer of dust.\n\n"
    "    Legend has it that Dave occasionally responded to the "
    "dances of mortals, until one day when a huge roar was "
    "heard and Dave simply vanished.  Many have speculated as "
    "to the fate of Dave, but all theories at present have yet "
    "to be proven either true or false." );
  set( "exits", ([
    "north" : "/zone/null/eternal/room052"
    ]) );
  set( "descs", ([
    "throne" :
      "It's a golden throne, about as big as your average castle.",
    ]) );
  set( "day_light", 60 );
  }
