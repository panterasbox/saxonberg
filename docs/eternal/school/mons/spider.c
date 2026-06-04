inherit MonsterCode;
inherit MonsterTalk;
#include "../defs.h"

void extra_create()
{
   set_name( "daddy longlegs" );
   add_alias( ({"daddy longlegs", "daddy", "longlegs", "spider", "monster"}) );
   set_short( "A daddy longlegs spider" );
   set_long(
      "This is a daddy longlegs spider.  He is just another creepy little "
      "spider, and he shouldn't be too hard to kill." );
   set_race( "spider" );
   set_natural_ac( 1 );
   set_alignment( -500 );
   set_type( "poison" );
   set_stat( "str", 13 );
   set_stat( "int", 13 );
   set_stat( "wil", 13 );
   set_stat( "con", 13 );
   set_stat( "dex", 13 );
   set_stat( "chr", 13 );
   add_money(random(30));

}


