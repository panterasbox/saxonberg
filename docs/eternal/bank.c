/*
**  Bank in Eternal City
*/
#include "/zone/null/eternal/eternal.h"

inherit RoomPlusCode;

void extra_create()
{
  set( "map_symbol", "SL" );
  set( "short", "Eternal Savings and Loan");
  set("day_long", 
   "High-tech cameras watch you closely as you enter the palatial " 
   "surroundings of this distinguished financial institution.  Magical " 
   "sensors mark the path up to the tellers, manned by bizarre " 
   "creatures, at the front of the building.  At the entrance, a large, " 
   "well-dressed squid welcomes you, relating to you the history of the " 
   "bank and the current events of the world in general."
   "  A banner along the wall states, 'Under New Management.'"
   //    "  To the east is a small room.  Signs hanging from the ceiling " 
   //    "indicate that you can apply for a Chextra Card there."
  );
  add("descs", ([ "cameras":
    "The cameras are closely tracking anything that moves within the bank.\n" 
    "Due to your vast experience, you can tell that there also must be\n" 
    "hidden lasers positioned to zap you, should you attempt to do anything\n" 
    "funny."
   ]));
  add( "descs", ([ "banner":
    "The banner states, 'Under New Management.'  A small BoMA logo\n"
    "is in the lower right hand corner."
   ]));
  add( "descs", (["sensors":
    "The sensors mark the sides of the pathway leading to the counters.  " 
    "They are arranged to give a nasty shock should you step off of them, " 
    "being extremely polite as they do so, of course.",
    "squid":
    "This twelve-tentacled squid is clad in a uniquely tailored "
    "tuxedo.  His top hat has a stylish tilt and his shiny, gold cummerbund "
    "is set off nicely by his slimy, purplish skin.  He seems rather "
    "pleased to greet you, waving his tentacles with joy.",
   ]));
  set( "exits", ([ "south": "/zone/null/eternal/room008" ]));
  set( "reset_data", ([ "bank" : BankCode ]) );
  set("day_light", WELL_LIT);

  set( InsideP, 1 );
}
