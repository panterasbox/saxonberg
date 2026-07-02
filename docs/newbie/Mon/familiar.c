//  Genious: newbie/Mon/familiar.c
//  Written by Hannah on 11/92.
//
//  94-05-05 Hannah -- Modified to use catch_tell instead of call_out in the
//                     following/fighting routines
//  95-05-14 Hannah -- Modified to use heart_beat instead of catch_tell, since
//                     combat would error from catch_tell for some reason.
//
//  This is a monster that follows a player of very evil or lower alignment,
//  and which attacks monsters of good alignment that the player is in
//  combat with.  The monster only hangs around for about 20 minutes.

inherit MonsterCode;
inherit MonsterTalk;
inherit SpecialAttackCode;

#define TYPE_LIST \
  ({ "grey wolf", "black cat", "small demon", "nightmare horse" })

string Leader;
object Lead_ob;
int    Type;


void extra_create()
{
    string POS, one, two;

    if( !clonep() ) return;
    set_name( "familiar" );
    add_alias( TYPE_LIST[ Type = random( 4 ) ] );
    sscanf( TYPE_LIST[ Type ], "%s %s", one, two );
    add_alias( two );
    set_short( "a familiar in the shape of a " + TYPE_LIST[ Type ] );
    set_long(
      "This is a familiar, protector of those with very evil hearts.  "+
      "The familiar will fight by the side of a warrior of very evil "+
      "alignment against a good foe." );
    set_natural_ac( 1 );
    if( random( 2 ) ) {
       set_gender( "male" );
       POS = "his";
    }
    else {
       set_gender( "female" );
       POS = "her";
    }
    set_race( "animal" );
    set_alignment( DEMONIC_AL );
    set_heal_rate( 10 );
    set_heal_amount( 10 );
    set_type( "edged" );
    set_stat( "str", 12 );
    set_stat( "int", 9 );
    set_stat( "wil", 10 );
    set_stat( "con", 14 );
    set_stat( "dex", 12 );
    set_stat( "chr", 14 );
    add_combat_message( "bite", "bites" );

    set_chat_chance( 40 );
    set_chat_rate( 32 );
    add_phrase( "The familiar grins evilly at you." );
    add_phrase(
       sprintf( "The familiar looks at %s surroundings suspiciously.", POS ) );
    add_phrase( "The familiar looks around for something to kill." );
    add_combat_phrase( "The familiar briefly glows with power." );
    set_mercy( 1 );
    enable_commands();
    Leader = "nobody";

    add_special_attack( "dark_attack", THISO, 20 );
}


void dark_attack( object target, object attacker )
{
    tell_room( ENV( attacker ),
      "The familiar summons an orb of darkness!\n" );
    tell_room( ENV( attacker ),
      sprintf( "The darkness envelops %s and %s screams in terror!\n",
      target->query_name(), subjective( target ) ), ({ target }) );
    tell_object( target,
      "The darkness envelops you as you scream in terror!\n" );
    target->take_damage( 5 + random( 5 ), 0, "unholy", attacker );
}


void timeout_familiar( object This_Ob )
{
    tell_room( ENV( Lead_ob ),
      "The familiar says: My time on this world is done.\nThe familiar "+
      "jumps into a previously unseen hole and returns to Hell.\n" );
    remove_call_out( "setup_familiar" );
    remove_call_out( "self_destruct" );
    destruct( This_Ob );
}


void setup_familiar()
{
    say( sprintf( "The familiar is now following %s.\n",  Leader ), Lead_ob );
    write( "The familiar is now following you.\n" );
}


void extra_init()
{
    if( THISP->is_player() && ( Leader == "nobody" ) &&
        ( THISP->query_alignment() < EVIL_AL ) )
    {
        Leader = PNAME;
        Lead_ob = FINDP( PRNAME );
        THISO->set_short( sprintf( "%s's familiar, in the shape of a %s",
          Leader, TYPE_LIST[ Type ] ) );
        call_out( "setup_familiar", 1 );
        call_out( "timeout_familiar", ( 60 * 20 ), THISO );
    }
}


void move_me( object This_ob )
{
if(ENV(Lead_ob)){
    tell_room( ENV( This_ob ),
      sprintf( "The familiar runs after %s.\n", Leader ) );
    move_object( This_ob, ENV( Lead_ob ) );
    tell_room( ENV( This_ob ),
      sprintf( "A familiar runs in, following %s.\n", Leader ),
      ({ Lead_ob }) );
    tell_object( Lead_ob, "The familiar runs in, following you.\n" );
}
}


void heart_beat()
{
    string  str1, str2, str3;
    mixed  *list;
    int     i;

    ::heart_beat();
    if( Leader == "nobody" )  return;
    if( !Lead_ob )
    {
        //  For some reason, this person isn't around anymore.  Did they
        //  quit or something?  In any case, bail out and leave.
        say( strformat( "A hole opens up in the ground, and the familiar "+
          "returns to " + possessive( THISO ) + " home in Hell\n" ) );
        destruct( THISO );
        return;
    }
    if( ENV( THISO ) != ENV( Lead_ob ) )
        //  This player has left the room.  Go get 'em.
        call_out( "move_me", 2, THISO );

    // -----------------------------------------------------------------------
    //  This is the routine to make the familiar attack a monster when the
    //  player being followed is in combat.  The familiar will only attack
    //  monsters of good alignment or higher.

    if( !THISO->in_combat() && Lead_ob->in_combat() )
    {
        // Player combat targ list
        list = filter_array( Lead_ob->query_targets(), #'query_npc );
        for( i = 0; i < sizeof( list ); i++ )
        {
            if( list[ i ]->query_alignment() < GOOD_AL )
                continue;
            THISO->attack_object( list[ i ] );
            break;
        }
    }
    return;
}
