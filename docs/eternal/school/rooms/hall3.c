#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadSign", "read" );
}

void extra_create()
{
   
   set("short", "Newbie School Hallway");
   set("day_long",
     "This is a dark and dismal hallway.  Half of the lights are out, and "
     "the remaining bulbs barely provide enough illumination to see.  The "
     "hallway seems to abruptly stop here, but there must be a way out.  "
     "There are a few lockers on the wall here, but they look to be in a state "
     "of complete and total disrepair.  A sign hangs from the center of the room. "
     "You look around for a while, trying to find the way <out>.");
   set( "descs", 
   ([  
      "sign" : "A sign hangs down from the ceiling.  Perhaps you could <read> it.",
      ({ "locker", "lockers" }) : "These lockers look like they haven't been used "
         "in years.  They used to have locks on them, but now the doors hang open.  "
         "You can see cobwebs on the inside.  Nothing more to see here, might as well "
         "move on.",
      "cobwebs" : "These cobwebs are old and dried up.  The spiders who left them here "
         "abandoned this area a long time ago.  Maybe you should try to find the way "
         "out too."
   ]) );
   set("day_light", 25);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("invis_exits", 
      ([ 
         "south" : ROOMS+"hall2",
         "out" : ROOMS+"hall4"
      ]) );

}


int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
    write("Don't forget to turn glow off when you don't need it!\n");
   write( "Pay attention to the room description, it's your only clue out of here.\n" );
   return 1;

}

