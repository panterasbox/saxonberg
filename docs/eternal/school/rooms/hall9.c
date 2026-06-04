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
     "and a few other useful rooms as well.  A sign hangs down from the "
     "ceiling.  You get the impression that you are nearing the end of the "
     "Newbie School.");
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
      "north" : ROOMS+"hall8",
      "south" : ROOMS+"hall10",
      "west" : ROOMS+"armorshop",
      "east" : ROOMS+"weapshop",
      "northwest" : ROOMS+"healshop"
   ]) );
   

}

int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   
   write( "West: Armor Shop\n" );
   write( "East: Weapon Shop\n" );
   return 1;

}
