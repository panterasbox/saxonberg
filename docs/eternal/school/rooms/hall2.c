#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_create()
{
   set("reset_data", 
      ([ "janitor" : MON+"janitor" ]) );
   
   set("short", "Newbie School Hallway");
   set("day_long",
     "The hallway continues here, and all the lights seem to be out.  This stretch "
     "of hallway is pretty barren, no lockers or classrooms or signs.  You see a dim "
     "light to the north.");
   set("day_light", NO_LIGHT);
   set("night_light", NO_LIGHT);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ "south" : ROOMS+"hall1", "north" : ROOMS+"hall3" ]) );
   set("invis_exits", ([ "out" : ROOMS+"hall3" ]) );

}

void extra_init()
{
   object guide;
   
   if( !(guide=present("guide", THISP)) || !(guide->query_glow()) )
      {
         write("Wow it sure is dark in here.  Maybe you should go south \n");
         write("and re-read the room description.\n\n"); 
      }
}
