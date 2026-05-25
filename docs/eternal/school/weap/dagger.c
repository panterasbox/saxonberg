inherit NewWeaponCode;

void extra_create()
{
    set_ids( ({ "ebony dagger", "dagger", "knife" }) );
    set_short( "an ebony dagger" );
    set_long(
      "This is a marginally crafted dagger made from the darkest of "
      "ebony.  You get the impression that while it may not be the best "
      "weapon out there, it's quite a bit better than using your bare hands." );
    set_material( "ebony" );
    set_weight( 60 );
    set_value( 35 );
    set_base_damage( 8 + random(5) );
    set_damage_step( 7 );
    set_base_speed( 15 );
    set_speed_step( 15 );
    set_prof_mod( 2 );
    add_combat_message( ({ "cut", "cuts" }) );
    set_proficiency( "knife" );
    set_damage_type( "piercing" );
    set_handed( 1 );
}
