#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   set("reset_data", 
   (["teacher" : MON+"teacher4",
     "bat" : WEAPONS+"bat" 
   ]) );
   set("short", "The Guide to EotL Classroom");
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
      "graffiti" : "skr0ch wuz heer",
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
      "west" : ROOMS+"hall6",
      "north" : ROOMS+"combat1",
      "down" : ROOMS+"combat2",
      "northeast" : ROOMS+"combat3"
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
   write("I didn't suffer through Vietnam to get lip from you! \n");
   write("Listen to me and we'll get along just fine.\n\n");
   write("If you think you're ready for battle, there are monsters waiting for you.\n");
   write("You might want to pick up the bat I've left for you and <wield> it.\n");
   write("If some other chump already took it, you can either wait for another one \n");
   write("or head back upstairs to the vending machine and buy a dagger.  Don't worry, \n");
   write("the dagger's free.  If you get hurt and end up back here, remember that you\n");
   write("regain health faster if you rest.\n");
   write("Good luck.  You'll need it chump.\n\n\n");
 
   write("Your teacher,\n");
   write("Mr. Nicholson\n");
 

   return 1;

}



