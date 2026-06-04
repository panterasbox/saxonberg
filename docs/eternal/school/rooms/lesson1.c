#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

void extra_init()
{
   add_action( "ReadBoard", "read" );
}

void extra_create()
{
   
   set("short", "Basic Commands Classroom");
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
      "graffiti" : "no0bie sk00l suks",
      ({ "lights", "fluorescent", "fluorescent lights" }) : "Ow, the lights hurt your "
         "eyes.  You look away before you scar your retinas."
   ]) );
   set("day_light", 80);
   set(InsideP, 1);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set("exits", 
   ([ 
      "west" : ROOMS+"lobby"
   ]) );
   
}


int ReadBoard( string arg )
{
   if( arg != "chalkboard" && arg != "board" )
   {
      notify_fail( "Read what?\n" );
      return 0;
   }
   write("BASIC EOTL COMMANDS\n\n\n");
   
   write("'l' lets you look at where you are.  'l' followed by an\n");
   write("argument, such as 'l monster' or 'l sword' allows you to\n");
   write("look at that object.\n\n");
 
   write("'hp' allows you to check your current condition in terms\n");
   write("of hp (hit points), mana (spell points), and ftg (fatigue).\n");
   write("It will also show your current xp (experience points).\n\n");
 
   write("'i' will tell you what you currently have in your inventory\n");
   write("i.e. what you are holding.\n\n");
   
   write("'score' will give you a nice screenful of information\n");
   write("about the overall status of your character including things\n");
   write("like age, stats, sex, gender, etc.\n\n");

   write("'list' followed by 'stats' will print out your stats.  Followed\n");
   write("by 'skills' it will print out your guild skills, if you are in a\n");
   write("guild (you'll learn about guilds later).  Followed by 'proficiencies'\n");
   write("it will print out your weapon proficiencies.\n\n");

   write("As you've learned by now, sometimes the room descriptions have \n");
   write("hints to what actions you need to do.  Pay attention to the room\n");
   write("descriptions and you will have much better luck in this game.\n");

   return 1;

}

