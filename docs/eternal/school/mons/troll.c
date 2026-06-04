inherit MonsterCode;
inherit MonsterNoFlee;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   object temp;
   
   set_name( "ugly troll" );
   add_alias( ({"troll", "ugly", "monster"}) );
   set_short( "An ugly troll" );
   set_long(
      "A troll stands here, guarding his territory.  He looks like he won't "
      "attack you unless he's attacked first, but his overpowering strength "
      "leads you to believe you might not be able to get away once you start "
      "a fight. ");
   set_race( "troll" );
   set_gender( "male" );
   set_alignment( 500 );
   set_type( "edged" );
   set_stat( "str", 20 );
   set_stat( "int", 9 );
   set_stat( "wil", 13 );
   set_stat( "con", 20 );
   set_stat( "dex", 16 );
   set_stat( "chr", 15 );
   add_combat_message( "claw", "claws" );
   add_money(random(20));
   
   set_chat_chance( 0 );
   set_chat_rate( 30 );
   add_phrase( "An ugly troll looks around suspiciously." );
   add_phrase( "An ugly troll mumbles something about strange voices." );

   temp = clone_object( ARMOR + "helmet" );
   if(temp){ move_object( temp, THISO );
   wear_armor( temp );}
   
   temp = clone_object( ARMOR + "vest" );
   if(temp){ move_object( temp, THISO );
   wear_armor( temp );}

}


