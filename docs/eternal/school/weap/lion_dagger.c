inherit NewWeaponCode;

void extra_create()
{
    set_ids( ({ "lion dagger", "dagger", "lion's claw dagger" }) );
    set_short( "a lion's claw dagger" );
    set_long(
      "This is a dagger crafted from the claw of a lion attached to a fine "
      "metal hilt.  It looks like it could do a decent amount of damage." );
    set_material( "bone" );
    set_weight( 60 );
    set_value( 150 );
    set_base_damage( 15 + random(10) );
    set_damage_step( 7 );
    set_base_speed( 15 );
    set_speed_step( 15 );
    set_prof_mod( 2 );
    add_combat_message( ({ "cut", "cuts" }) );
    set_proficiency( "knife" );
    set_damage_type( "piercing" );
    set_handed( 1 );
}
