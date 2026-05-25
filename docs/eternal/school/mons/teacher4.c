inherit MonsterAsk;
inherit MonsterTalk;
#include "../defs.h"

string lesson = "When you attack something or something attacks you, you enter "
"combat.  Combat consists of a combat round, called every two seconds of real"
"time.  Each combat round, the attacker and the victim trade off attempts "
"at hitting each other, casting spells, initiating skills, and other "
"nasty things.\n\n"
"The ultimate goal of combat is to kill your opponent.  "
"This results in gaining experience points and any treasure that opponent "
"might have been carrying.  However, if you die during combat, you will "
"become a ghost and must pay a visit to Dr. Frankenstein to regenerate.\n\n"
"Ask me about fleeing for another tip.";


string flee = "If your opponent, or opponents, are too difficult for you to "
"handle, you may find that fleeing from them is the best way to stay alive.  "
"You can try to flee combat by moving away from your aggressors in any "
"available direction.  Sometimes, your opponents will have the chance to pull "
"you back into combat before you can escape -- be careful!  Fleeing may be "
"automated with the wimpy command.  Ask me about wimpy for the final tip.";

string wimpy = "By setting your wimpy to a particular number, you are "
"instructing your character to automatically flee if your hitpoints fall below "
"that number.  A wimpy level of zero will result in no auto-fleeing by your "
"character, and is known as \"brave\" mode.  Some guilds or specializations "
"may limit your ability to use wimpy at all.  For more information on wimpy, "
"read <help wimpy>.\n\nOk, that's about all I have, you should be ready "
"to go fight now!.";


void extra_create()
{
   
   set_name( "teacher" );
   add_alias( ({"teacher", "Mr. Nicholson", "mr. nicholson", "nicholson", "Nicholson",
    "monster"}) );
   set_short( "Mr. Nicholson" );
   set_long(
      "This is Mr. Nicholson.  He's slightly balding...ok, more than slightly, "
      "and the comb-over doesn't really do a good job of disguising it.  Mr. "
      "Nicholson has let himself go lately, but he used to be in the military, "
      "and he looks like he could teach you a thing or two about combat.");
   set_race( "human" );
   
   set_chat_rate( 30 );
   set_chat_chance( 0 );
   add_phrase( "Mr. Nicholson says: Ask me about combat...if you dare." );
   add_phrase( "Mr. Nicholson mumbles something about Vietnam." );
   
   ask_me_about( "combat", "#say "+lesson );
   ask_me_about( "fleeing", "#say "+flee );
   ask_me_about( "wimpy", "#say "+wimpy );
}

