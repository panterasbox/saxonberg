inherit MonsterCode;
inherit MonsterPickUp;
inherit MonsterMove;
inherit SpecialAttackCode;
#include "../defs.h"


void extra_create()
{
   object temp;
   
   set_name( "janitor" );
   add_alias( ({"janitor", "newbie school janitor", "monster"}) );
   set_short( "The newbie school janitor" );
   set_long(
      "This is the newbie school janitor.  His job is to pick up the mess "
      "that newbies leave behind.  He has been doing this job for a while, "
      "but rather than looking old, he looks like he's been hitting the weight "
      "room between shifts.  He is a force to be reckoned with. ");
   set_race( "human" );
   set_gender( "male" );
   set_alignment( 1000 );
   set_type( "blunt" );
   set_stat( "str", 55 );
   set_stat( "int", 24 );
   set_stat( "wil", 25 );
   set_stat( "con", 55 );
   set_stat( "dex", 42 );
   set_stat( "chr", 25 );
   add_combat_message( "smack", "smacks" );
   
   set_pick_up_rate( 10 );
   set_pick_up_chance( 80 );
   set_use_stuff( 0 );
   
   set_move_rate( 15 );
   set_move_chance( 40 );
   set_wander_dir( ({ ALLOWED }) );
   set_avoid_props( ({ "UnderwaterP, ArenaP" }) );
   
   add_special_attack( "Sweep", THISO, 15 );

}

void Sweep( object victim, object attacker )
{
   string name;
   
   if(!objectp(victim)) return;
   name = victim->query_name();
   tell_object( victim, "Janitor picks up his broom and pokes you in the gut!\n" );
   tell_room( ENV(THISO), "Janitor picks up his broom and pokes "+name+
      " in the gut!\n", ({victim}));
   victim->take_damage( 15+random( 20 ), 0, "blunt", attacker );
}
