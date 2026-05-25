#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadSign", "read" );
}

void extra_create()
{
   
   set("short", "Newbie School Basement");
   set("day_long",
     "This is the Newbie School Basement.  There are more classes down here, "
     "and judging from the noise, some kind of beast is nearby.  There are no "
     "lockers on the walls here.  A sign hangs down from the ceiling.");
   set( "descs", 
   ([  
      "sign" : "A sign hangs down from the ceiling.  Perhaps you could <read> it.",
   ]) );
   set("day_light", 50);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "north" : ROOMS+"hall5",
      "south" : ROOMS+"hall7",
      "west" : ROOMS+"lesson5",
      "east" : ROOMS+"lesson6"
   ]) );
   

}

int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   
   write( "West: The Guide to EotL\n" );
   write( "East: Combat\n" );
   return 1;

}
