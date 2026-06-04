#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   set("reset_data", (["teacher" : MON+"teacher3" ]) );
   set("short", "The Guide to EotL Classroom");
   set("day_long",
     "This is a sparsely decorated classroom.  There are a couple of desks, "
     "a chalkboard at the front of the room, and harsh fluorescent lights overhead.  "
     "The growling noises you heard from the hallway seem to be fainter in here.");
   set( "descs", 
   ([  
      ({"chalkboard", "board" }) : "A chalkboard with writing on it.  Maybe you should <read> it.",
      ({ "desk", "desks" }) : "All these desks look the same, and they're all somehow "
         "just barely too small to fit into comfortably.  Someone has carved some "
         "graffiti into one of the desks, but you can't quite tell what it says from "
         "here.",
      "graffiti" : "rox0r yuor box0r",
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
      "east" : ROOMS+"hall6"
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
   write("Today's lesson is an important one, so please pay attention. \n");
   write("Listen to me and we'll tackle this lesson together.\n\n\n");
 
   write("Your teacher,\n");
   write("Mrs. Brantley\n");
 

   return 1;

}



