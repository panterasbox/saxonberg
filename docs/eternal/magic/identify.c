/*
** IdentifyCode
** -- support for changing item name/short/long when "identified"
*/
 
/*==========================================================================*/
 
string id_name, *id_aliases, id_short, id_long, id_msg;
 
/*==========================================================================*/
 
void set_id_name(string s)
{
    id_name=s;
}
 
string query_id_name()
{
    return(id_name);
}
 
/*==========================================================================*/
 
void add_id_alias(string s)
{
    if (!pointerp(id_aliases))
        id_aliases=({ });
    id_aliases+=({ s });
}
 
string *query_id_aliases()
{
    return(id_aliases);
}
 
/*==========================================================================*/
 
void set_id_short(string s)
{
    id_short=s;
}
 
string query_id_short()
{
    return(id_short);
}
 
/*==========================================================================*/
 
void set_id_long(string s)
{
    id_long = strformat( s );
}
 
string query_id_long()
{
    return(id_long);
}
 
/*==========================================================================*/
 
void set_id_msg(string s)
{
    id_msg = strformat( s );
}
 
string query_id_msg()
{
    return(id_msg);
}
 
/*==========================================================================*/
 
status identify()
{
    int i;
    string shrt, bonus_str, blah, blah2;
 
    bonus_str = " ";
    if (stringp(id_name))
        THISO->set_name(id_name);
    if (pointerp(id_aliases)) {
        for(i=0; i<sizeof(id_aliases); i++)
            THISO->add_alias(id_aliases[i]);
    }
    if (stringp(id_short))
    {
        shrt=THISO->short();
        if(sscanf(shrt,"%s(enchanted)%s",blah,blah2))
            bonus_str += "(enchanted) ";
        if(sscanf(shrt,"%s(blessed)%s",blah,blah2))
            bonus_str += "(blessed) ";
        if(sscanf(shrt,"%s(sharpened)%s",blah,blah2))
            bonus_str += "(sharpened) ";
        if(sscanf(shrt,"%s(tempered)%s",blah,blah2))
            bonus_str += "(tempered) ";
        if(sscanf(shrt,"%s(marked)%s",blah,blah2))
            bonus_str += "(marked)";
        THISO->set_short(id_short+bonus_str);
    }
    if (stringp(id_long))
        THISO->set_long(id_long);
    if (id_msg)
        write("\n" + id_msg);
    return(1);
}
 
