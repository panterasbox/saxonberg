inherit MonsterMobCode;
inherit MonsterTalk;
#include "../defs.h"


void extra_create()
{
   object temp;
   
   set_name( "goblin child" );
   set_defend_type( "momandkid" );
   add_alias( ({"goblin", "child", "monster"}) );
   set_short( "A wimpy goblin child" );
   set_long(
      "This is a little wimpy goblin child.  At first you think he looks "
      "like he was dropped on his head as a child, but then you remember, "
      "that's just what goblins look like." );
   set_race( "goblin" );
   set_natural_ac( 1 );
   set_alignment( -500 );
   set_type( "blunt" );
   set_stat( "str", 9 );
   set_stat( "int", 9 );
   set_stat( "wil", 9 );
   set_stat( "con", 9 );
   set_stat( "dex", 9 );
   set_stat( "chr", 9 );
   add_money(random(45));
   add_combat_message( "smack", "smacks" );

   set_chat_chance( 30 );
   set_chat_rate( 30 );
   add_phrase( "A wimpy goblin child picks his nose." );
   add_phrase( "A wimpy goblin child glares at you." );
   
   temp = clone_object( ARMOR + "mittens" );
   if(temp){ move_object( temp, THISO );
   wear_armor( temp );}
   
   temp = clone_object( ARMOR + "jeans" );
   if(temp){ move_object( temp, THISO );
   wear_armor( temp );}
}

int query_my_defend( string s ) { return 0; }

