inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "horse" );
   add_alias( ({"monster", "horse"}) );
   set_short( "An old horse" );
   set_long(
      "Once upon a time, this horse had his own tv show.  Now he just sits in "
      "the wheat fields and wallows in self pity.");
   set_race( "horse" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 14 );
   set_stat( "int", 14 );
   set_stat( "wil", 17 );
   set_stat( "con", 17 );
   set_stat( "dex", 9 );
   set_stat( "chr", 10 );
   add_combat_message( "bite", "bites" );
   add_money(random(40));

   set_chat_chance( 85 );
   set_chat_rate( 15 );
   add_phrase( "#mred" );
}


