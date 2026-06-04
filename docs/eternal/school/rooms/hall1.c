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
     "hallway seems to be descending into darkness.  "
     "There are a few lockers on the wall here, but they look to be in a state "
     "of complete and total disrepair.  You get the feeling that you should look "
     "into the <glow> command of your Guide before you go farther north.  To the "
     "east and west are classrooms.  A sign hangs from the center of the room with "
     "information on these classes.  When you are done with these two lessons and "
     "ready to move on, go north to continue.");
   set( "descs", 
   ([  
      "sign" : "A sign hangs down from the ceiling.  Perhaps you could <read> it.",
      ({ "locker", "lockers" }) : "These lockers look like they haven't been used "
         "in years.  They used to have locks on them, but now the doors hang open.  "
         "You can see cobwebs on the inside.  Nothing more to see here, might as well "
         "move on."
   ]) );
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "east" : ROOMS+"lesson3",
      "west" : ROOMS+"lesson4",
      "south" : ROOMS+"lobby",
      "north" : ROOMS+"hall2"
   ]) );
   

}


int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   
   write( "East: The SET Command\n" );
   write( "West: Aliases and Subs\n" );
   return 1;

}

