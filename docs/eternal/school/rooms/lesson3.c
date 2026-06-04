#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   set("reset_data", (["teacher" : MON+"teacher1" ]) );
   set("short", "The Set Command Classroom");
   set("day_long",
     "This is a sparsely decorated classroom.  There are a couple of desks, "
     "a chalkboard at the front of the room, and harsh fluorescent lights overhead.");
   set( "descs", 
   ([  
      ({"chalkboard", "board" }) : "A chalkboard with writing on it.  Maybe you should <read> it.",
      ({ "desk", "desks" }) : "All these desks look the same, and they're all somehow "
         "just barely too small to fit into comfortably.  Someone has carved some "
         "graffiti into one of the desks, but you can't quite tell what it says from "
         "here.",
      "graffiti" : "1337 hax0r",
      ({ "lights", "fluorescent", "fluorescent lights" }) : "Ow, the lights hurt your "
         "eyes.  You look away before you scar your retinas."
   ]) );
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("exits", 
   ([ 
      "west" : ROOMS+"hall1"
   ]) );
   
}


int ReadBoard( string arg )
{
   if( arg != "chalkboard" && arg != "board" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   write("Welcome to my classroom\n");
   write("If you'd like to learn a lesson, try to <ask> me <about set>.\n\n\n");
 
   write("Your teacher,\n");
   write("Mrs. Martin\n");
 

   return 1;

}

