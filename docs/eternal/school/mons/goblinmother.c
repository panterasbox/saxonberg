inherit MonsterMobCode;
inherit MonsterTalk;
#include "../defs.h"
#include <ansi.h>

void extra_create()
{
   
   object temp;
   
   set_name( "goblin mother" );
   set_defend_type( "momandkid" );
   add_alias( ({"goblin", "mother", "monster"}) );
   set_short( "A wimpy goblin mother" );
   set_long(
      "This is a wimpy mother goblin.  She is very protective of her "
      "child, and will do anything to protect him." );
   set_race( "goblin" );
   set_natural_ac( 1 );
   set_alignment( -500 );
   set_type( "blunt" );
   set_stat( "str", 11 );
   set_stat( "int", 11 );
   set_stat( "wil", 11 );
   set_stat( "con", 11 );
   set_stat( "dex", 11 );
   set_stat( "chr", 11 );
   add_money(random(50));
   add_combat_message( "slap", "slaps" );
/*
   set_defend_message( "A wimpy goblin mother rushes to the defense of "
      "her child!" );
*/

   set_chat_chance( 30 );
   set_chat_rate( 30 );
   add_phrase( "A wimpy goblin mother looks around the room." );
   add_phrase( "A wimpy goblin mother picks her butt." );
   
   temp = clone_object( ARMOR + "shield" );
   if(temp){ move_object( temp, THISO );
   wear_armor( temp );}
}


