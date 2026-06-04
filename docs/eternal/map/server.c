#include "map.h"

string get_map_for( object who )
{
    object o = FINDO( GENERATOR );
    object e;
    string map;
    
    if( who ) 
        e = ENV( who );
    
    if( ! o )
    {
        catch( load_object( GENERATOR ) );
        o = FINDO( GENERATOR );
    }
    
    if( o && e && who && who->query_ansi( ) )
    {
        string map_file = o->get_map_storage_path( object_name( e ) );
        
        map = read_file( map_file );
        
        if( ! stringp( map ) )
        {
            switch( map_file )
            {
                case "bbinn2":  map_file = "bbinn1";  break;
                case "cabaltv_places_Videopolis_vidlounge":  
                    map_file = "cabaltv_places_Videopolis_videoshop";  break;
                case "pacifist_dorkside":  
                    map_file = "pacifist_grind";  break;
                case "miscellany_arena_spec_room":
                case "miscellany_arena_multi_multi":
                    map_file = "miscellany_arena_ch_room";  break;
                case "magic_magic_shop":
                case "magic_magic_u1":
                case "magic_magic_u2":
                    map_file = "magic_magic1";  break;
                case "castles_lugerquest_luger1":
                case "castles_lugerquest_luger2":
                    map_file = "library";  break;
                case "stat_room":
                    map_file = "stat_room1";  break;
            }
            if( map_file[0..3] == "tpa_" )
                map_file = "tpa_station";
                
            map = read_file( STORAGE_DIR + map_file );
        }
    }
        
    if( ! stringp( map ) )
    {
        map = read_file( GENERIC_MAP_FILE );
    }
    
    return( map );    
}

void create( )
{
    seteuid( getuid( ) );    
}
