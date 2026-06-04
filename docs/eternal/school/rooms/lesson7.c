#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   set("reset_data", (["teacher" : MON+"teacher5"]) );
   set("short", "The Communication (part 1) Classroom");
   set("day_long",
     "This is a sparsely decorated classroom.  There are a couple of desks, "
     "a chalkboard at the front of the room, and harsh fluorescent lights overhead.  "
     "The growling noises you heard before seem to be much louder in here.  You "
     "also hear a faint buzzing, different from the continuous buzz of the lights.");
   set( "descs", 
   ([  
      ({"chalkboard", "board" }) : "A chalkboard with writing on it.  Maybe you should <read> it.",
      ({ "desk", "desks" }) : "All these desks look the same, and they're all somehow "
         "just barely too small to fit into comfortably.  Someone has carved some "
         "graffiti into one of the desks, but you can't quite tell what it says from "
         "here.",
      "graffiti" : "death2",
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
      "east" : ROOMS+"hall8",
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
   write("Jesus loves you, and so do I.\n");
   write("When you are ready, I will teach you about basic communication.\n");
   write("Just listen to me, and your lesson will begin.\n\n");
   write("Your teacher,\n");
   write("Sister Rose\n");
 

   return 1;

}



