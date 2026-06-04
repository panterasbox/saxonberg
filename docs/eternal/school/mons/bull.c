inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "bull" );
   add_alias( ({"monster", "bull"}) );
   set_short( "An old bull" );
   set_long(
      "This old bull used to have his pick of the nice young cows, but "
      "as they aged, they started rejecting him.  You might not want to "
      "piss him off.");
   set_race( "creature" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 20 );
   set_stat( "int", 14 );
   set_stat( "wil", 17 );
   set_stat( "con", 20 );
   set_stat( "dex", 19 );
   set_stat( "chr", 10 );
   add_combat_message( "gore", "gores" );
   add_money(random(100));

   set_chat_chance( 85 );
   set_chat_rate( 15 );
   add_phrase( "#moo" );
   add_phrase( "#fart" );
}


