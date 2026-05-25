inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   set_name( "rooster" );
   add_alias( ({"monster", "rooster"}) );
   set_short( "A cocky rooster" );
   set_long(
      "A rooster struts around here, master of his domain.  He looks like "
      "he gets all the chicks. ");
   set_race( "bird" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "piercing" );
   set_stat( "str", 16 );
   set_stat( "int", 16 );
   set_stat( "wil", 16 );
   set_stat( "con", 11 );
   set_stat( "dex", 11 );
   set_stat( "chr", 11 );
   add_combat_message( "peck", "pecks" );
   add_money(random(40));
   
   set_chat_chance( 80 );
   set_chat_rate( 20 );
   add_phrase( "A rooster struts around smugly." );
   add_phrase( "#bawk" );
   add_phrase( "#peck" );
}


