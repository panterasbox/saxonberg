inherit GunCode;
inherit SpecialAttackCode;
#include "../defs.h"
#define AMMO WEAPONS "bb"

void extra_create()
{
   set_name( "BB gun" );
   set_ids( ({ "bb gun", "gun", "red ryder", "red ryder bb gun", "rifle" }) );
   set_short( "a Red Ryder BB gun" );
   set_long( "This is a genuine Red Ryder BB gun.  It can hold up to 50 BBs "
      "at a time.  It has an authentic wood stock and a long metal barrel.  "
      "If it jams, you might want to try to <unjam> it.  Be careful with it "
      "though, or you'll shoot your eye out!" );
   
   
   set_proficiency( "rifle" );
   set_handed( 2 );
   set_mag_fed( 0 );
   set_capacity( 50 );
   set_ammo_type( "bb" );
   set_jam_chance( 5 );
    set_material("metal");
    set_material_name("wood and metal");
   set_jam_delay( 1 );
   set_reliability( 170 );
   set("value", 150);
   fill_with( AMMO );
   
   add_special_attack( "shoot_yer_eye_out", THISO, 5 );
   
}

status shoot_yer_eye_out( object victim, object attacker)
{
   string name;

   if(!objectp(attacker)) return 0;
   
   name = attacker->query_name();

  	tell_object( attacker, "You miss your target, the bb ricochets, and hits you in "
  	   "the face!\n" );
	attacker->take_damage( 5+random( 10 ), 0, "piercing", THISO );
	if(!objectp(attacker)) return 0;
  	tell_room( ENV(attacker), "A bb ricochets and hits" +name+ " in the face!\n", 
  	   ({attacker}) );
  	return 0;
}
