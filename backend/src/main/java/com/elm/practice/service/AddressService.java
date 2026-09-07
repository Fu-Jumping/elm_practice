package com.elm.practice.service;

import com.elm.practice.common.ApiException;
import com.elm.practice.common.RequestUtil;
import com.elm.practice.common.ViewMapper;
import com.elm.practice.domain.Domain;
import com.elm.practice.dto.Requests;
import com.elm.practice.repository.InMemoryRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class AddressService {
    private final InMemoryRepository repo;
    public AddressService(InMemoryRepository repo){this.repo=repo;}
    public List<Map<String,Object>> list(Domain.User u){synchronized(repo){return repo.addresses.values().stream().filter(a->a.userId.equals(u.id)).sorted(Comparator.comparing((Domain.Address a)->a.isDefault).reversed().thenComparing(a->a.updatedAt,Comparator.reverseOrder())).map(ViewMapper::address).toList();}}
    public Domain.Address get(Domain.User u,String id){Domain.Address a=repo.addresses.get(id);if(a==null||!a.userId.equals(u.id))throw ApiException.notFound("地址不存在");return a;}
    public Domain.Address create(Domain.User u,Requests.AddressRequest r){validate(r); synchronized(repo){boolean makeDefault=Boolean.TRUE.equals(r.isDefault)||repo.addresses.values().stream().noneMatch(a->a.userId.equals(u.id));if(makeDefault)clearDefault(u.id);String id=repo.nextId("da");Domain.Address a=new Domain.Address(id,u.id,r.contactName.trim(),r.contactSex==null?"":r.contactSex.trim(),r.contactPhone.trim(),r.region.trim(),r.detail.trim(),r.label==null?"":r.label.trim(),makeDefault,LocalDateTime.now());repo.addresses.put(id,a);return a;}}
    public Domain.Address patch(Domain.User u,String id,Requests.AddressRequest r){synchronized(repo){Domain.Address a=get(u,id);if(r.contactName!=null)a.contactName=RequestUtil.required(r.contactName,"contactName");if(r.contactSex!=null)a.contactSex=r.contactSex.trim();if(r.contactPhone!=null){if(!r.contactPhone.trim().matches("^1\\d{10}$"))throw ApiException.badRequest("contactPhone必须是 11 位手机号");a.contactPhone=r.contactPhone.trim();}if(r.region!=null)a.region=RequestUtil.required(r.region,"region");if(r.detail!=null)a.detail=RequestUtil.required(r.detail,"detail");if(r.label!=null)a.label=r.label.trim();if(Boolean.TRUE.equals(r.isDefault)){clearDefault(u.id);a.isDefault=true;}a.updatedAt=LocalDateTime.now();return a;}}
    public void delete(Domain.User u,String id){Domain.Address a=get(u,id);synchronized(repo){repo.addresses.remove(id);if(a.isDefault){repo.addresses.values().stream().filter(x->x.userId.equals(u.id)).max(Comparator.comparing(x->x.updatedAt)).ifPresent(x->x.isDefault=true);}}}
    private void validate(Requests.AddressRequest r){if(r==null)throw ApiException.badRequest("请求体不能为空");RequestUtil.required(r.contactName,"contactName");if(r.contactPhone==null||!r.contactPhone.trim().matches("^1\\d{10}$"))throw ApiException.badRequest("contactPhone必须是 11 位手机号");RequestUtil.required(r.region,"region");RequestUtil.required(r.detail,"detail");}
    private void clearDefault(String uid){repo.addresses.values().stream().filter(a->a.userId.equals(uid)).forEach(a->a.isDefault=false);}
}
