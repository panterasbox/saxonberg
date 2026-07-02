//  pistol.c
//  Written by Hannah on 9/94
//  This is a little gun with 6 shots.

inherit GunCode;


void extra_create()
{
    set_name( "pistol" );
    set_ids( ({"gun","pistol"}) );
    set_short( "a small pistol" );
    set_long( "This is a small pistol." );
    set_mag_fed( 0 );   //  loaded with shots, not clips
    set_ammo_type( "9mm" );
    set_capacity(6);
    set_handed( 1 );
    set_recoil( 1 );
    set_value( 200 );
    set_weight( 200 );
    set_proficiency( "pistol" );
    set_material("steel");
    fill_with("/zone/fantasy/genious/newbie/Wea/9mm");
}
