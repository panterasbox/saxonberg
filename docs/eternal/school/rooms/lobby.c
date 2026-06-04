#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;
inherit DoorCode;

void extra_init()
{
   add_action( "ReadSign", "read" );
}

void extra_create()
{
   
   set("short", "Newbie School Lobby");
   set("day_long",
     "This is the lobby of the Newbie School.  If you do not have a "
     "Guide to EotL [wristcomp] in your inventory (type <i> to see "
     "your inventory), you should probably go back to the Entrance "
     "Room and buy one from the vending machine.  Don't worry, they're "
     "free.  You will not be able to continue any farther north without "
     "the Guide.  To the east and west are classrooms.  A sign hangs from "
     "the center of the room with information on these classes.  These "
     "classrooms will be located throughout the school, and teach some of the "
     "basic concepts of the mud.  While not required, they are highly "
     "recommended.  To the northwest is a stat raising room.  When you are "
     "done with these two lessons and ready to move on, go north to continue.");
   set( "descs", 
   ([  
      "sign" : "A sign hangs down from the ceiling.  Perhaps you could <read> it."
   ]) );
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "east" : ROOMS+"lesson1",
      "west" : ROOMS+"lesson2",
      "north" : "@GoNorth",
      "northwest" : ROOMS+"statroom"
   ]) );
   
   add_door( "south", ROOMS+"entrance", ROOMS+"door1" );

}


int ReadSign( string arg )
{
   if( arg != "sign" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   
   write( "East: Basic EotL Commands\n" );
   write( "West: Getting Around EotL\n" );
   return 1;

}

string GoNorth()
{
   
   object who;
   who = THISP;

   if(!present( "guide", who ) ) 
   {
      notify_fail( "Sorry, you need a guide to continue.\n");
      return 0;
   }
   else 
   {
      return ROOMS+"hall1";
   }
}
