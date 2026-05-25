#include "../defs.h"
inherit "../deathsignal.c";
inherit RoomPlusCode;

#define AIR ROOMS "limbo"

int altitudestate;
//0 is on the ground, 1 is rising, 2 is at altitude, 3 is descending
object balloon;
string destination;
string startloc;

void extra_create()
{
   set("reset_data", (["lever" : OBJ+"lever", 
      "pilot" : MON+"pilot" ]) );
   set("short", "Inside the Newbie Academy Balloon");
   set("day_long",
      "You are in the Eotl Newbie Academy hot air balloon.  This balloon "
      "provides transportation between the Newbie Academy and the Lounge.  "
      "There is a lever here that controls the balloon.  If you <pull> the "
      "lever, it will make the balloon take off.  To exit the balloon once "
      "it has landed, <climb out>.  If you want, you can <look out> to see "
      "what's outside the balloon.");
   set("day_light", 80);
   set("night_light", 80);
   set(NoPKP, 1);
   set(NoTeleportInP, 1);
   set(NoCombatP, 1);
   set("descs", ([ "out": "@do_out" ]) );
   altitudestate = 0;
}


void extra_init()
{
   add_action( "PullLever", "pull" );
   add_action( "PushLever", "push" );
   add_action( "GetMeOut", "climb" );
}

status PullLever(string foo)
{
   object bob;
   object who;
   who = THISP;

   if(foo != "lever")
   {
   notify_fail("Pull what?\n");
   return 0;
   }

   if((bob=present("pilot", ENV(who))) && bob!=who)
   {
      bob->no_wei_you_turd(who, altitudestate);
      return 1;
   }

   if(altitudestate != 0)
   {
      tell_object(who, "You pull the lever, but nothing happens.\n");
      tell_room(ENV(who), CAP(PRNAME)+" pulls the lever, but nothing "
         "happens.\n", ({who}));
   return 1;
   }

   if(startloc == LOUNGE) destination = ROOMS "parking_lot";
   else destination = LOUNGE;

   tell_object(who, "You pull the lever and the balloon begins to "
      "rise!\n");
   tell_room(ENV(who), CAP(PRNAME)+" pulls the lever and the balloon "
      "begins to rise.\n", ({who}));
   tell_room(ENV(balloon), "The Newbie Academy Balloon takes off!\n");
   move_object( balloon, AIR );
   altitudestate = 1;
   call_out("SendMessages", 5, who, 2, "pull");
   return 1;
}

status GoingUp(object who)
{
   tell_room(ENV(who), "The balloon arrives at cruising altitude.\n");
   altitudestate = 2;
   call_out("SendMessages", 5, who, 4, "hover");
   return 1;
}


status PushLever(string foo)
{
   object bob;
   object who;
   who = THISP;

   if(foo != "lever")
   {
      notify_fail("Push what?\n");
      return 0;
   }

   if((bob=present("pilot", ENV(who))) && bob!=who)
   {
      bob->no_wei_you_turd(who, altitudestate);
      return 1;
   }

   switch(altitudestate)
   {
      case 0: case 3:
         tell_object(who, "You push the lever, but nothing happens.\n");
         tell_room(ENV(who), CAP(PRNAME)+" pushes the lever, but nothing "
            "happens.\n", ({who}));
         return 1;
 
      case 1:
         tell_object(who, "You push the lever and the balloon begins to "
            "descend!\n");
         tell_room(ENV(who), CAP(PRNAME)+" pushes the lever and the balloon "
            "begins to descend.\n", ({who}));
         altitudestate = 3;
         destination = startloc;
         call_out("SendMessages", 5, who, 2, "push");
         return 1;
      
      case 2:
         tell_object(who, "You push the lever and the balloon begins to "
            "descend!\n");
         tell_room(ENV(who), CAP(PRNAME)+" pushes the lever and the balloon "
            "begins to descend.\n", ({who}));
         altitudestate = 3;
         call_out("SendMessages", 5, who, 2, "push");
         return 1;
   }
}

status GoingDown(object who)
{
   string temp;
   tell_room(ENV(who), "The balloon touches down gently.\n");
   altitudestate = 0;
   move_object( balloon, destination );
   tell_room(ENV(balloon), "The balloon lands gently.\n");
   if(destination == ROOMS "parking_lot")
   {
      tell_room(ENV(who), strformat("The balloon will be departing for the "
         "return trip to the lounge in 1 minute.  Please climb out now.  "
         "Thank you, and please come again.\n"));
      call_out("PullLever", 60, "lever");
      temp = destination;
      destination = startloc;
      startloc = temp;
      return 1;
   }
   temp = destination;
   destination = startloc;
   startloc = temp;
   return 1;
}

status GetMeOut(string where)
{
   object who;
   who = THISP;

   if(where != "out")
   {
      notify_fail("Climb where?\n");
      return 0;
   }

   if(altitudestate != 0)
   {
      tell_object(who, 
         "You can't climb out in mid-air!  What are you, crazy?\n");
      tell_room(ENV(who), CAP(PRNAME)+" tries to climb out of the balloon "
         "in mid-air.  What a moron.\n",({who}));
      return 1;
   }
    
   tell_object(who, 
      "You climb out of the Newbie Academy Balloon.\n");
   tell_room(ENV(who), CAP(PRNAME)+" climbs out of the Newbie Academy "
      "Balloon.\n",({who}));
   move_object(who, ENV(balloon));
   tell_room(ENV(who), CAP(PRNAME)+" climbs out of the Newbie Academy "
      "Balloon.\n",({who}));
   who->glance();
   return 1;
}

void SetBalloonObject(object obj)
{
    balloon = obj;
}

void SetStart(string str)
{
    startloc = str;
}

int do_out()
{
   object who;
   who = THISP;

   if(!balloon || !ENV(balloon))
   {
      tell_object(who, "I am broken, please use the <bug> command.\n");
      //return notify_fail("I am broken, please use the <bug> command.\n");
      return 0;
   }

   tell_object(who,"Outside the balloon, you see:\n");
   tell_object(who, ENV(balloon)->long());
   return 1;
}

status SendMessages(object who, int number, string action)
{
   int q;
   int goose;
   string message;
   
   q = random(100);
   
   switch(q)
   {
      case 0 .. 15:
         message = "A bird flies by right outside the balloon.\n";
         break;
      case 16 .. 45:
         message = "The wind whips through your hair.\n";
         break;
      case 46 .. 66:
         message = "Balloon Pilot scratches his head.\n";
         break;
      case 67 .. 98:
         message = "The clouds float by outside the balloon.\n";
         break;
      case 99:
         message = "A goose gets disoriented and flies right into your "
            "face!\n";
         goose = 1;
         break;
   }
   
   if(number > 0)
   {
      if(goose)
      {
         tell_object(who, message);
         tell_room(ENV(who), "A goose flies right into "+CAP(PRNAME)+"!!\n",
            ({who}));
         who->take_damage( random(9)+1, 0, "blunt", ENV(who));
         number--;
         call_out("SendMessages", 5, who, number, action);
         goose = 0;
         return 1;
      }
               
      tell_room(ENV(who), message);
      number--;
      call_out("SendMessages", 5, who, number, action);
      return 1;
   }
   
   if(action == "pull")
   {
      call_out("GoingUp", 1, who);
      return 1;
   }
   
   if(action == "hover")
   {
      call_out("PushLever", 1, "lever");
      return 1;
   }
   
   call_out("GoingDown", 1, who);
}

string query_destination()
{
   return destination;
}
