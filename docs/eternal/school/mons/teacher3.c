inherit MonsterAsk;
inherit MonsterTalk;
#include "../defs.h"

string lesson = "This lesson is about the Guide to EotL, which you "
"already have, or you wouldn't have been able to get this far!  "
"By now you should know how to use the glow command, but there "
"are other handy uses for the newbie player.  The Guide can be "
"purchased in any vending machine in the game, and it is always "
"free.  You might want to type 'info guide' to learn more about "
"the other features.  To see a few examples, ask me about examples.";

string examples = "Here are some examples of some of the more useful "
"functions of the Guide: \n\n"
"'query'        Query allows you to compare a foe (monster or player) "
"to you in terms of cumulative ability.  A threat level 1.000 is the same "
"as you, the higher the number, the harder it will be for you.  Each query "
"costs you 5 mana points. \n\n"
"'beam me up'   This command allows you to 'beam' back to the EotL player "
"lounge at a cost of some mana, depending on your level.  As you get bigger, "
"The cost and delay for this command increase. \n\n"
"'Dest corpse'  This command will get rid of the corpses of the monsters you "
"kill, which reduces clutter and clears game resources which, in turn, reduces "
"lag which is nicer for you.\n\n"
"'stupor'       As a newbie player (which the guide will determine), you are "
"allowed to use the guide to 'stupor.'  This exchanges unused fatigue points "
"for hit points, or vice versa, when you're in a bind. \n\n"
"Remember you can always type 'info guide' to get more information about the "
"guide.";


void extra_create()
{
   
   set_name( "teacher" );
   add_alias( ({"teacher", "Mrs. Brantley", "mrs. brantley", "brantley", "Brantley",
    "monster"}) );
   set_short( "Mrs. Brantley" );
   set_long(
      "This is Mrs. Brantley.  She is well-known as everyone's favorite teacher.  "
      "She stands here waiting to teach you, all you have to do is ask.  Her area "
      "of expertise is the <guide>, so that's probably what you should ask her "
      "about.");
   set_race( "human" );
   
   set_chat_rate( 30 );
   set_chat_chance( 75 );
   add_phrase( "Mrs. Brantley says: Ask me about guide." );
   add_phrase( "Mrs. Brantley hums tunelessly." );
   
   ask_me_about( "guide", "#say "+lesson );
   ask_me_about( "examples", "#say "+examples );
}

