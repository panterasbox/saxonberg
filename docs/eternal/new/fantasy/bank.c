/*
**  Bank in Eternal City
*/

inherit RoomPlusCode;

#include "/zone/null/eternal/eternal.h"

void extra_create()
{
    set( "short", "Eternal Savings and Loan");
    set("day_long", 
      "High-tech cameras watch you closely as you enter the palatial " +
      "surroundings of this distinguished financial institution.  Magical " +
      "sensors mark the path up to the tellers, manned by bizarre " +
      "creatures, at the front of the building.  At the entrance, a large, " +
      "well-dressed squid welcomes you, relating to you the history of the " +
      "bank and the current events of the world in general."+
      "\n\n   To the east is a small room.  Signs hanging from the ceiling " +
      "indicate that you can apply for a Chextra Card there."
    );
    add("descs", ([ "cameras":
      "The cameras are closely tracking anything that moves within the bank.\n" +
      "Due to your vast experience, you can tell that there also must be\n" +
      "hidden lasers positioned to zap you, should you attempt to do anything\n" +
      "funny."
    ]));
    add( "descs", (["sensors":
      "The sensors mark the sides of the pathway leading to the counters.  " +
      "They are arranged to give a nasty shock should you step off of them, " +
      "being extremely polite as they do so, of course."
    ]));
   set( "exits",
        ([ "south" : "room008",  "east" : "bank_annex" ]) );
   set( "reset_data",
        ([ "bank" : BankCode, "sign" : OBJECTS + "bank_sign" ]) );
   set("day_light", WELL_LIT);
}
